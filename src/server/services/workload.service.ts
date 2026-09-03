import { prisma } from "@/lib/prisma";
import { ACTIVE_LEAD_STATUSES } from "@/server/assignment/assignment.capacity";

export async function getWorkload(organizationId: string) {
  const members = await prisma.salesTeamMember.findMany({
    where: { organizationId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } },
      team: { select: { id: true, name: true } },
    },
  });

  const userIds = members.map((m) => m.userId);

  const [activeCounts, wonCounts, totalCounts] = await Promise.all([
    prisma.lead.groupBy({
      by: ["assignedUserId"],
      where: { organizationId, assignedUserId: { in: userIds }, status: { in: [...ACTIVE_LEAD_STATUSES] } },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["assignedUserId"],
      where: { organizationId, assignedUserId: { in: userIds }, status: "WON" },
      _count: { _all: true },
    }),
    prisma.leadAssignment.groupBy({
      by: ["assignedUserId"],
      where: { organizationId, assignedUserId: { in: userIds } },
      _count: { _all: true },
    }),
  ]);

  const activeMap = new Map(activeCounts.map((c) => [c.assignedUserId, c._count._all]));
  const wonMap = new Map(wonCounts.map((c) => [c.assignedUserId, c._count._all]));
  const totalMap = new Map(totalCounts.map((c) => [c.assignedUserId, c._count._all]));

  return members.map((member) => {
    const activeLeadCount = activeMap.get(member.userId) ?? 0;
    return {
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      isActive: member.isActive && member.user.isActive,
      isPaused: member.isPaused,
      teamId: member.teamId,
      teamName: member.team.name,
      assignmentWeight: member.assignmentWeight,
      maxActiveLeads: member.maxActiveLeads,
      activeLeadCount,
      capacityUtilization:
        member.maxActiveLeads && member.maxActiveLeads > 0
          ? Math.min(1, activeLeadCount / member.maxActiveLeads)
          : null,
      wonLeadCount: wonMap.get(member.userId) ?? 0,
      totalAssignedCount: totalMap.get(member.userId) ?? 0,
      lastAssignedAt: member.lastAssignedAt,
    };
  });
}
