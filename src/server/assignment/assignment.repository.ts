import type { AssignmentMethod, AssignmentStrategy, Prisma } from "@prisma/client";

/**
 * Locks a lead row for update within the given transaction. Must be the
 * first statement of any assignment attempt so concurrent assignment calls
 * for the same lead serialize instead of racing (see assignment.service.ts
 * for the full concurrency strategy).
 */
export async function lockLeadForUpdate(tx: Prisma.TransactionClient, leadId: string) {
  const rows = await tx.$queryRaw<{ id: string; assignment_status: string }[]>`
    SELECT id, assignment_status FROM leads WHERE id = ${leadId} FOR UPDATE
  `;
  return rows[0] ?? null;
}

/** Locks (or creates, if missing) the AssignmentState row for a team+strategy. */
export async function lockOrCreateAssignmentState(
  tx: Prisma.TransactionClient,
  organizationId: string,
  teamId: string,
  strategy: AssignmentStrategy
) {
  const existing = await tx.$queryRaw<
    { id: string; round_robin_index: number; last_assigned_user_id: string | null }[]
  >`
    SELECT id, round_robin_index, last_assigned_user_id
    FROM assignment_states
    WHERE organization_id = ${organizationId} AND team_id = ${teamId} AND strategy = ${strategy}::"AssignmentStrategy"
    FOR UPDATE
  `;

  if (existing[0]) {
    return {
      id: existing[0].id,
      roundRobinIndex: existing[0].round_robin_index,
      lastAssignedUserId: existing[0].last_assigned_user_id,
    };
  }

  const created = await tx.assignmentState.create({
    data: { organizationId, teamId, strategy, roundRobinIndex: 0 },
  });
  return {
    id: created.id,
    roundRobinIndex: created.roundRobinIndex,
    lastAssignedUserId: created.lastAssignedUserId,
  };
}

export function updateAssignmentState(
  tx: Prisma.TransactionClient,
  stateId: string,
  data: { roundRobinIndex: number; lastAssignedUserId: string }
) {
  return tx.assignmentState.update({
    where: { id: stateId },
    data,
  });
}

export function assignLeadFields(
  tx: Prisma.TransactionClient,
  leadId: string,
  data: {
    assignedUserId: string | null;
    assignedTeamId: string | null;
    assignmentStatus: "ASSIGNED" | "UNASSIGNED" | "REASSIGNMENT_REQUIRED";
    assignmentMethod: AssignmentMethod | null;
  }
) {
  return tx.lead.update({ where: { id: leadId }, data });
}

export function createLeadAssignment(
  tx: Prisma.TransactionClient,
  data: {
    organizationId: string;
    leadId: string;
    assignedUserId: string | null;
    teamId: string | null;
    assignmentMethod: AssignmentMethod;
    assignmentRuleId?: string | null;
    assignmentReason?: string | null;
  }
) {
  return tx.leadAssignment.create({ data });
}

export function createAssignmentHistory(
  tx: Prisma.TransactionClient,
  data: {
    organizationId: string;
    leadId: string;
    previousUserId?: string | null;
    newUserId?: string | null;
    previousTeamId?: string | null;
    newTeamId?: string | null;
    changedByUserId?: string | null;
    assignmentMethod: AssignmentMethod;
    assignmentRuleId?: string | null;
    reason?: string | null;
  }
) {
  return tx.assignmentHistory.create({ data });
}

export function createLeadActivity(
  tx: Prisma.TransactionClient,
  data: {
    organizationId: string;
    leadId: string;
    userId?: string | null;
    activityType: "ASSIGNED" | "REASSIGNED" | "ASSIGNMENT_FAILED";
    metadata?: Prisma.InputJsonValue;
  }
) {
  return tx.leadActivity.create({ data });
}

export function createAuditLog(
  tx: Prisma.TransactionClient,
  data: {
    organizationId: string;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return tx.auditLog.create({ data });
}

export function touchMemberLastAssigned(
  tx: Prisma.TransactionClient,
  organizationId: string,
  teamId: string,
  userId: string
) {
  return tx.salesTeamMember.update({
    where: { organizationId_teamId_userId: { organizationId, teamId, userId } },
    data: { lastAssignedAt: new Date() },
  });
}

export function getAssignmentHistoryForLead(organizationId: string, leadId: string, prisma: Prisma.TransactionClient) {
  return prisma.assignmentHistory.findMany({
    where: { organizationId, leadId },
    orderBy: { createdAt: "desc" },
  });
}
