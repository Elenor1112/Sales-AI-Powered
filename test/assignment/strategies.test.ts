import { describe, it, expect } from "vitest";
import {
  roundRobin,
  leastAssigned,
  weightedRoundRobin,
  manual,
} from "@/server/assignment/assignment.strategies";
import type { EligibleMember, AssignmentStateSnapshot } from "@/server/assignment/assignment.types";

function member(overrides: Partial<EligibleMember> & { userId: string }): EligibleMember {
  return {
    assignmentWeight: 1,
    maxActiveLeads: null,
    activeLeadCount: 0,
    lastAssignedAt: null,
    ...overrides,
  };
}

const emptyState: AssignmentStateSnapshot = { roundRobinIndex: 0, lastAssignedUserId: null };

describe("roundRobin", () => {
  it("picks the first member (sorted by userId) when no prior assignment", () => {
    const members = [member({ userId: "c" }), member({ userId: "a" }), member({ userId: "b" })];
    const result = roundRobin(members, emptyState);
    expect(result.userId).toBe("a");
  });

  it("advances cyclically to the next member after the last assignee", () => {
    const members = [member({ userId: "a" }), member({ userId: "b" }), member({ userId: "c" })];
    const state: AssignmentStateSnapshot = { roundRobinIndex: 0, lastAssignedUserId: "a" };
    const result = roundRobin(members, state);
    expect(result.userId).toBe("b");
  });

  it("wraps around to the first member after the last one", () => {
    const members = [member({ userId: "a" }), member({ userId: "b" }), member({ userId: "c" })];
    const state: AssignmentStateSnapshot = { roundRobinIndex: 2, lastAssignedUserId: "c" };
    const result = roundRobin(members, state);
    expect(result.userId).toBe("a");
  });

  it("restarts from the beginning if the last assignee is no longer eligible", () => {
    // "b" was last assigned but has since been paused/removed from the eligible set.
    const members = [member({ userId: "a" }), member({ userId: "c" })];
    const state: AssignmentStateSnapshot = { roundRobinIndex: 5, lastAssignedUserId: "b" };
    const result = roundRobin(members, state);
    expect(result.userId).toBe("a");
  });

  it("throws when there are no eligible members", () => {
    expect(() => roundRobin([], emptyState)).toThrow();
  });

  it("produces a full round-robin cycle across repeated calls", () => {
    const members = [member({ userId: "a" }), member({ userId: "b" }), member({ userId: "c" })];
    let state = emptyState;
    const sequence: string[] = [];
    for (let i = 0; i < 6; i++) {
      const result = roundRobin(members, state);
      sequence.push(result.userId);
      state = { roundRobinIndex: result.nextRoundRobinIndex, lastAssignedUserId: result.nextLastAssignedUserId };
    }
    expect(sequence).toEqual(["a", "b", "c", "a", "b", "c"]);
  });
});

describe("leastAssigned", () => {
  it("picks the member with the fewest active leads", () => {
    const members = [
      member({ userId: "a", activeLeadCount: 5 }),
      member({ userId: "b", activeLeadCount: 1 }),
      member({ userId: "c", activeLeadCount: 3 }),
    ];
    expect(leastAssigned(members).userId).toBe("b");
  });

  it("tie-breaks by whoever was assigned longest ago (nulls first)", () => {
    const members = [
      member({ userId: "a", activeLeadCount: 2, lastAssignedAt: new Date("2026-01-01") }),
      member({ userId: "b", activeLeadCount: 2, lastAssignedAt: null }),
      member({ userId: "c", activeLeadCount: 2, lastAssignedAt: new Date("2026-06-01") }),
    ];
    expect(leastAssigned(members).userId).toBe("b");
  });

  it("tie-breaks deterministically by userId when counts and lastAssignedAt are equal", () => {
    const members = [member({ userId: "z" }), member({ userId: "a" })];
    expect(leastAssigned(members).userId).toBe("a");
  });

  it("throws when there are no eligible members", () => {
    expect(() => leastAssigned([])).toThrow();
  });
});

describe("weightedRoundRobin", () => {
  it("distributes selections roughly proportional to weight over many rounds", () => {
    const members = [
      member({ userId: "a", assignmentWeight: 1 }),
      member({ userId: "b", assignmentWeight: 1 }),
      member({ userId: "c", assignmentWeight: 2 }),
    ];
    let state: AssignmentStateSnapshot = emptyState;
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    const rounds = 40; // 10 full cycles of total weight 4
    for (let i = 0; i < rounds; i++) {
      const result = weightedRoundRobin(members, state);
      counts[result.userId] += 1;
      state = { roundRobinIndex: result.nextRoundRobinIndex, lastAssignedUserId: result.nextLastAssignedUserId };
    }
    // Total weight = 4, so over 40 picks: a~10, b~10, c~20
    expect(counts.a).toBe(10);
    expect(counts.b).toBe(10);
    expect(counts.c).toBe(20);
  });

  it("rejects a non-positive or non-integer weight", () => {
    const members = [member({ userId: "a", assignmentWeight: 0 })];
    expect(() => weightedRoundRobin(members, emptyState)).toThrow();

    const membersFloat = [member({ userId: "a", assignmentWeight: 1.5 })];
    expect(() => weightedRoundRobin(membersFloat, emptyState)).toThrow();
  });

  it("throws when there are no eligible members", () => {
    expect(() => weightedRoundRobin([], emptyState)).toThrow();
  });
});

describe("manual", () => {
  it("always selects the specified target user", () => {
    const result = manual("target-user-id");
    expect(result.userId).toBe("target-user-id");
    expect(result.nextLastAssignedUserId).toBe("target-user-id");
  });
});
