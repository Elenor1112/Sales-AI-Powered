import { prisma } from "@/lib/prisma";
import { ACTIVE_LEAD_STATUSES } from "@/server/assignment/assignment.capacity";

export interface AnalyticsDateRange {
  from?: Date;
  to?: Date;
}

function dateFilter(range: AnalyticsDateRange) {
  if (!range.from && !range.to) return undefined;
  return { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) };
}

export async function getLeadAnalytics(organizationId: string, range: AnalyticsDateRange) {
  const createdAt = dateFilter(range);
  const baseWhere = { organizationId, ...(createdAt ? { createdAt } : {}) };

  const [
    total,
    bySource,
    byStatus,
    byUser,
    byTeam,
    assignedCount,
    unassignedCount,
    assignmentFailures,
  ] = await Promise.all([
    prisma.lead.count({ where: baseWhere }),
    prisma.lead.groupBy({ by: ["source"], where: baseWhere, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
    prisma.lead.groupBy({
      by: ["assignedUserId"],
      where: { ...baseWhere, assignedUserId: { not: null } },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["assignedTeamId"],
      where: { ...baseWhere, assignedTeamId: { not: null } },
      _count: { _all: true },
    }),
    prisma.lead.count({ where: { ...baseWhere, assignmentStatus: "ASSIGNED" } }),
    prisma.lead.count({
      where: { ...baseWhere, assignmentStatus: { in: ["UNASSIGNED", "REASSIGNMENT_REQUIRED"] } },
    }),
    prisma.leadActivity.count({ where: { organizationId, activityType: "ASSIGNMENT_FAILED" } }),
  ]);

  const avgAssignmentTime = await prisma.$queryRaw<{ avg_seconds: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM (la.created_at - l.created_at))) AS avg_seconds
    FROM lead_assignments la
    JOIN leads l ON l.id = la.lead_id
    WHERE la.organization_id = ${organizationId}
  `;

  return {
    totalLeads: total,
    leadsBySource: bySource.map((r) => ({ source: r.source, count: r._count._all })),
    leadsByStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    leadsBySalesperson: byUser.map((r) => ({ userId: r.assignedUserId, count: r._count._all })),
    leadsByTeam: byTeam.map((r) => ({ teamId: r.assignedTeamId, count: r._count._all })),
    assignedLeads: assignedCount,
    unassignedLeads: unassignedCount,
    assignmentFailureCount: assignmentFailures,
    averageTimeToAssignmentSeconds: avgAssignmentTime[0]?.avg_seconds ?? null,
  };
}

export async function getAssignmentAnalytics(organizationId: string, range: AnalyticsDateRange) {
  const createdAt = dateFilter(range);

  const [byUser, byTeam, byMethod, unassignedCount, reassignmentCount] = await Promise.all([
    prisma.leadAssignment.groupBy({
      by: ["assignedUserId"],
      where: { organizationId, assignedUserId: { not: null }, ...(createdAt ? { createdAt } : {}) },
      _count: { _all: true },
    }),
    prisma.leadAssignment.groupBy({
      by: ["teamId"],
      where: { organizationId, teamId: { not: null }, ...(createdAt ? { createdAt } : {}) },
      _count: { _all: true },
    }),
    prisma.leadAssignment.groupBy({
      by: ["assignmentMethod"],
      where: { organizationId, ...(createdAt ? { createdAt } : {}) },
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: { organizationId, assignmentStatus: { in: ["UNASSIGNED", "REASSIGNMENT_REQUIRED"] } },
    }),
    prisma.assignmentHistory.count({ where: { organizationId, ...(createdAt ? { createdAt } : {}) } }),
  ]);

  const members = await prisma.salesTeamMember.findMany({ where: { organizationId } });
  const activeCounts = await prisma.lead.groupBy({
    by: ["assignedUserId"],
    where: {
      organizationId,
      assignedUserId: { in: members.map((m) => m.userId) },
      status: { in: [...ACTIVE_LEAD_STATUSES] },
    },
    _count: { _all: true },
  });
  const activeMap = new Map(activeCounts.map((c) => [c.assignedUserId, c._count._all]));

  const capacityUtilization = members
    .filter((m) => m.maxActiveLeads !== null && m.maxActiveLeads > 0)
    .map((m) => ({
      userId: m.userId,
      utilization: (activeMap.get(m.userId) ?? 0) / (m.maxActiveLeads as number),
    }));

  // groupBy can't join related fields, so names/team names are resolved in a
  // second pass for the small number of distinct users/teams involved.
  const userIds = byUser.map((r) => r.assignedUserId).filter((id): id is string => !!id);
  const teamIds = byTeam.map((r) => r.teamId).filter((id): id is string => !!id);
  const [users, teams] = await Promise.all([
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
    teamIds.length ? prisma.salesTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } }) : [],
  ]);
  const userNameMap = new Map(users.map((u) => [u.id, u.name]));
  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));

  return {
    assignedPerSalesperson: byUser.map((r) => ({
      userId: r.assignedUserId,
      name: r.assignedUserId ? (userNameMap.get(r.assignedUserId) ?? null) : null,
      count: r._count._all,
    })),
    assignedPerTeam: byTeam.map((r) => ({
      teamId: r.teamId,
      name: r.teamId ? (teamNameMap.get(r.teamId) ?? null) : null,
      count: r._count._all,
    })),
    assignedByStrategy: byMethod.map((r) => ({ method: r.assignmentMethod, count: r._count._all })),
    unassignedLeadCount: unassignedCount,
    reassignmentCount,
    capacityUtilization,
  };
}

export async function getConversionAnalytics(organizationId: string, range: AnalyticsDateRange, groupBy: "salesperson" | "team" | "source") {
  const createdAt = dateFilter(range);
  const where = { organizationId, ...(createdAt ? { createdAt } : {}) };

  const groupField = groupBy === "salesperson" ? "assignedUserId" : groupBy === "team" ? "assignedTeamId" : "source";

  const [totals, contacted, qualified, proposal, won] = await Promise.all([
    prisma.lead.groupBy({ by: [groupField], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: [groupField], where: { ...where, contactedAt: { not: null } }, _count: { _all: true } }),
    prisma.lead.groupBy({ by: [groupField], where: { ...where, qualifiedAt: { not: null } }, _count: { _all: true } }),
    prisma.lead.groupBy({ by: [groupField], where: { ...where, proposalAt: { not: null } }, _count: { _all: true } }),
    prisma.lead.groupBy({ by: [groupField], where: { ...where, status: "WON" }, _count: { _all: true } }),
  ]);

  function toMap(rows: { _count: { _all: number } }[], key: typeof groupField) {
    return new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.map((r: any) => [r[key], r._count._all])
    );
  }

  const totalsMap = toMap(totals, groupField);
  const contactedMap = toMap(contacted, groupField);
  const qualifiedMap = toMap(qualified, groupField);
  const proposalMap = toMap(proposal, groupField);
  const wonMap = toMap(won, groupField);

  return Array.from(totalsMap.entries()).map(([key, total]) => ({
    group: key,
    totalLeads: total,
    contacted: contactedMap.get(key) ?? 0,
    qualified: qualifiedMap.get(key) ?? 0,
    proposal: proposalMap.get(key) ?? 0,
    won: wonMap.get(key) ?? 0,
    conversionRate: total > 0 ? (wonMap.get(key) ?? 0) / total : 0,
  }));
}

export async function getRevenueAnalytics(organizationId: string, range: AnalyticsDateRange) {
  const createdAt = dateFilter(range);
  const where = { organizationId, ...(createdAt ? { createdAt } : {}) };

  const [totalAgg, wonAgg, byUser, byTeamLeads, bySource] = await Promise.all([
    prisma.deal.aggregate({ where, _sum: { value: true }, _avg: { value: true } }),
    prisma.deal.aggregate({ where: { ...where, stage: "WON" }, _sum: { value: true } }),
    prisma.deal.groupBy({ by: ["ownerId"], where: { ...where, stage: "WON" }, _sum: { value: true } }),
    prisma.lead.findMany({
      where: { ...where, assignedTeamId: { not: null } },
      select: { id: true, assignedTeamId: true },
    }),
    prisma.deal.groupBy({ by: ["leadId"], where: { ...where, stage: "WON", leadId: { not: null } }, _sum: { value: true } }),
  ]);

  return {
    totalDealValue: totalAgg._sum.value ?? 0,
    averageDealValue: totalAgg._avg.value ?? 0,
    wonRevenue: wonAgg._sum.value ?? 0,
    revenueBySalesperson: byUser.map((r) => ({ userId: r.ownerId, revenue: r._sum.value ?? 0 })),
    // Revenue by team/source requires joining deals -> leads; left as a
    // documented simplification for this pass (deals don't carry a
    // denormalized team/source field) — see docs/lead-distribution.md.
    leadsWithTeams: byTeamLeads.length,
    wonDealsWithLeads: bySource.length,
  };
}
