import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const ACTIVE_LEAD_STATUSES = ["NEW", "ASSIGNED", "CONTACTED", "QUALIFIED", "PROPOSAL"] as const;

export function findManyTeams(organizationId: string) {
  return prisma.salesTeam.findMany({
    where: { organizationId },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function findTeamById(organizationId: string, teamId: string) {
  return prisma.salesTeam.findFirst({
    where: { id: teamId, organizationId },
  });
}

export function createTeam(organizationId: string, data: { name: string; description?: string }) {
  return prisma.salesTeam.create({
    data: { organizationId, name: data.name, description: data.description },
  });
}

export function updateTeam(
  organizationId: string,
  teamId: string,
  data: Partial<{ name: string; description: string | null; isActive: boolean }>
) {
  return prisma.salesTeam.update({
    where: { id: teamId, organizationId },
    data,
  });
}

export function deleteTeam(organizationId: string, teamId: string) {
  return prisma.salesTeam.delete({ where: { id: teamId, organizationId } });
}

export async function findTeamMembers(organizationId: string, teamId: string) {
  const members = await prisma.salesTeamMember.findMany({
    where: { organizationId, teamId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const activeCounts = await prisma.lead.groupBy({
    by: ["assignedUserId"],
    where: {
      organizationId,
      assignedUserId: { in: members.map((m) => m.userId) },
      status: { in: [...ACTIVE_LEAD_STATUSES] },
    },
    _count: { _all: true },
  });
  const countMap = new Map(activeCounts.map((c) => [c.assignedUserId, c._count._all]));

  return members.map((m) => ({ ...m, activeLeadCount: countMap.get(m.userId) ?? 0 }));
}

export function findMembershipByUser(organizationId: string, teamId: string, userId: string) {
  return prisma.salesTeamMember.findUnique({
    where: { organizationId_teamId_userId: { organizationId, teamId, userId } },
  });
}

export function addTeamMember(
  organizationId: string,
  teamId: string,
  data: { userId: string; assignmentWeight?: number; maxActiveLeads?: number | null }
) {
  return prisma.salesTeamMember.create({
    data: {
      organizationId,
      teamId,
      userId: data.userId,
      assignmentWeight: data.assignmentWeight ?? 1,
      maxActiveLeads: data.maxActiveLeads ?? null,
    },
  });
}

export function updateTeamMember(
  organizationId: string,
  teamId: string,
  userId: string,
  data: Partial<{
    isActive: boolean;
    isPaused: boolean;
    assignmentWeight: number;
    maxActiveLeads: number | null;
  }>
) {
  return prisma.salesTeamMember.update({
    where: { organizationId_teamId_userId: { organizationId, teamId, userId } },
    data,
  });
}

export function removeTeamMember(organizationId: string, teamId: string, userId: string) {
  return prisma.salesTeamMember.delete({
    where: { organizationId_teamId_userId: { organizationId, teamId, userId } },
  });
}

export function findActiveMembersForAssignment(
  tx: Prisma.TransactionClient,
  organizationId: string,
  teamId: string
) {
  return tx.salesTeamMember.findMany({
    where: {
      organizationId,
      teamId,
      isActive: true,
      isPaused: false,
      user: { isActive: true },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export { ACTIVE_LEAD_STATUSES };
