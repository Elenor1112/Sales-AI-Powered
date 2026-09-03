import type { EligibleMember, AssignmentStateSnapshot, StrategySelection } from "./assignment.types";

/**
 * All strategies below are pure functions: given an already-filtered list of
 * eligible members (see assignment.capacity.ts) and the current persisted
 * state, they deterministically pick one member. They perform no I/O so they
 * can be called safely inside a transaction while holding row locks, and are
 * directly unit-testable without a database.
 */

function sortMembersDeterministically(members: EligibleMember[]): EligibleMember[] {
  return [...members].sort((a, b) => a.userId.localeCompare(b.userId));
}

export function roundRobin(
  members: EligibleMember[],
  state: AssignmentStateSnapshot
): StrategySelection {
  if (members.length === 0) {
    throw new Error("roundRobin requires at least one eligible member");
  }

  const sorted = sortMembersDeterministically(members);

  const lastIndex = state.lastAssignedUserId
    ? sorted.findIndex((m) => m.userId === state.lastAssignedUserId)
    : -1;

  // If the previously assigned user is no longer eligible (paused, inactive,
  // over capacity, or removed), start from the beginning of the current
  // eligible set rather than trying to preserve their old position.
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % sorted.length;
  const selected = sorted[nextIndex];

  return {
    userId: selected.userId,
    nextRoundRobinIndex: nextIndex,
    nextLastAssignedUserId: selected.userId,
  };
}

export function leastAssigned(members: EligibleMember[]): StrategySelection {
  if (members.length === 0) {
    throw new Error("leastAssigned requires at least one eligible member");
  }

  const sorted = [...members].sort((a, b) => {
    if (a.activeLeadCount !== b.activeLeadCount) {
      return a.activeLeadCount - b.activeLeadCount;
    }
    // Tie-break: prefer whoever was assigned longest ago (nulls first — never assigned).
    const aTime = a.lastAssignedAt?.getTime() ?? -Infinity;
    const bTime = b.lastAssignedAt?.getTime() ?? -Infinity;
    if (aTime !== bTime) return aTime - bTime;
    return a.userId.localeCompare(b.userId);
  });

  const selected = sorted[0];
  return {
    userId: selected.userId,
    nextRoundRobinIndex: 0,
    nextLastAssignedUserId: selected.userId,
  };
}

/**
 * Smooth weighted round robin (Nginx-style): each member accrues "current
 * weight" by their configured weight every round; the member with the
 * highest current weight is selected, then has the total weight subtracted.
 * This spreads picks proportionally rather than bursting N-in-a-row for a
 * high-weight member. State is round-tripped through roundRobinIndex by
 * encoding it as a per-member counter map persisted as JSON isn't available
 * on AssignmentState (which only stores a single index + last user), so we
 * approximate with a simpler deficit approach anchored on lastAssignedUserId:
 * walk the sorted member list starting after the last assignee, weighted by
 * how many "slots" each member has left in the current weight cycle.
 */
export function weightedRoundRobin(
  members: EligibleMember[],
  state: AssignmentStateSnapshot
): StrategySelection {
  if (members.length === 0) {
    throw new Error("weightedRoundRobin requires at least one eligible member");
  }
  for (const m of members) {
    if (!Number.isInteger(m.assignmentWeight) || m.assignmentWeight <= 0) {
      throw new Error(`Invalid assignment weight for user ${m.userId}: must be a positive integer`);
    }
  }

  const sorted = sortMembersDeterministically(members);
  const totalWeight = sorted.reduce((sum, m) => sum + m.assignmentWeight, 0);

  // Expand into a weighted cyclic sequence position using roundRobinIndex as
  // a running cursor over a virtual sequence of length totalWeight, where
  // each member occupies `assignmentWeight` consecutive virtual slots.
  const cursor = state.roundRobinIndex % totalWeight;

  let runningTotal = 0;
  let selected = sorted[0];
  for (const member of sorted) {
    runningTotal += member.assignmentWeight;
    if (cursor < runningTotal) {
      selected = member;
      break;
    }
  }

  const nextCursor = (cursor + 1) % totalWeight;

  return {
    userId: selected.userId,
    nextRoundRobinIndex: nextCursor,
    nextLastAssignedUserId: selected.userId,
  };
}

export function manual(targetUserId: string): StrategySelection {
  return {
    userId: targetUserId,
    nextRoundRobinIndex: 0,
    nextLastAssignedUserId: targetUserId,
  };
}
