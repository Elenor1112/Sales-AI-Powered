import type { Prisma } from "@prisma/client";
import type { EligibleMember } from "./assignment.types";

export const ACTIVE_LEAD_STATUSES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
] as const;

/**
 * Loads the eligible sales team members for automatic assignment, applying
 * every exclusion rule from spec §5: inactive account, not on the team,
 * paused, or (when capacity enforcement is enabled) at/over their configured
 * max active lead count. Must be called with a transaction client while the
 * relevant Lead/AssignmentState rows are locked (see assignment.service.ts)
 * so the computed active-lead counts are consistent with the assignment
 * decision being made.
 */
export async function getEligibleMembers(
  tx: Prisma.TransactionClient,
  organizationId: string,
  teamId: string,
  options: { enforceCapacity: boolean }
): Promise<EligibleMember[]> {
  const members = await tx.salesTeamMember.findMany({
    where: {
      organizationId,
      teamId,
      isActive: true,
      isPaused: false,
      user: { isActive: true },
    },
  });

  if (members.length === 0) return [];

  const activeCounts = await tx.lead.groupBy({
    by: ["assignedUserId"],
    where: {
      organizationId,
      assignedUserId: { in: members.map((m) => m.userId) },
      status: { in: [...ACTIVE_LEAD_STATUSES] },
    },
    _count: { _all: true },
  });
  const countMap = new Map(activeCounts.map((c) => [c.assignedUserId as string, c._count._all]));

  const eligible: EligibleMember[] = [];
  for (const member of members) {
    const activeLeadCount = countMap.get(member.userId) ?? 0;
    if (
      options.enforceCapacity &&
      member.maxActiveLeads !== null &&
      activeLeadCount >= member.maxActiveLeads
    ) {
      continue;
    }
    eligible.push({
      userId: member.userId,
      assignmentWeight: member.assignmentWeight,
      maxActiveLeads: member.maxActiveLeads,
      activeLeadCount,
      lastAssignedAt: member.lastAssignedAt,
    });
  }

  return eligible;
}
