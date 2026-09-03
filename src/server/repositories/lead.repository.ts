import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { LeadQueryInput } from "@/server/validation/lead.schema";
import { paginationToSkipTake } from "@/lib/pagination";

export function buildLeadWhere(organizationId: string, query: LeadQueryInput): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { organizationId };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { company: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.assignedUserId) where.assignedUserId = query.assignedUserId;
  if (query.assignedTeamId) where.assignedTeamId = query.assignedTeamId;
  if (query.assignmentStatus) where.assignmentStatus = query.assignmentStatus;
  if (query.source) where.source = query.source;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.metaCampaignId) where.metaCampaignId = query.metaCampaignId;
  if (query.metaFormId) where.metaFormId = query.metaFormId;
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
    };
  }

  return where;
}

export async function findManyLeads(organizationId: string, query: LeadQueryInput) {
  const where = buildLeadWhere(organizationId, query);
  const { skip, take } = paginationToSkipTake(query);

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take,
      orderBy: { [query.sortBy]: query.sortDir },
      include: {
        assignedUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignedTeam: { select: { id: true, name: true } },
        leadTags: { include: { tag: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total };
}

export function findLeadById(organizationId: string, leadId: string) {
  return prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      assignedUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignedTeam: { select: { id: true, name: true } },
      leadTags: { include: { tag: true } },
      notes: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
      deals: { orderBy: { createdAt: "desc" } },
    },
  });
}

/**
 * Duplicate detection for non-Meta sources per spec §18: match on
 * email+phone within the same organization. Meta leads use the stronger
 * (organizationId, metaLeadId) unique constraint instead — see
 * src/server/services/lead.service.ts createLeadFromMeta().
 */
export async function findPossibleDuplicate(
  organizationId: string,
  data: { email?: string | null; phone?: string | null }
) {
  if (!data.email && !data.phone) return null;
  return prisma.lead.findFirst({
    where: {
      organizationId,
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });
}

export function createLead(organizationId: string, data: Prisma.LeadUncheckedCreateInput) {
  return prisma.lead.create({ data: { ...data, organizationId } });
}

export function updateLead(organizationId: string, leadId: string, data: Prisma.LeadUncheckedUpdateInput) {
  return prisma.lead.update({ where: { id: leadId, organizationId }, data });
}

export function deleteLead(organizationId: string, leadId: string) {
  return prisma.lead.delete({ where: { id: leadId, organizationId } });
}

export function findActivities(organizationId: string, leadId: string) {
  return prisma.leadActivity.findMany({
    where: { organizationId, leadId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });
}

export function findAssignmentHistory(organizationId: string, leadId: string) {
  return prisma.assignmentHistory.findMany({
    where: { organizationId, leadId },
    orderBy: { createdAt: "desc" },
    include: {
      previousUser: { select: { id: true, name: true } },
      newUser: { select: { id: true, name: true } },
      previousTeam: { select: { id: true, name: true } },
      newTeam: { select: { id: true, name: true } },
      changedByUser: { select: { id: true, name: true } },
    },
  });
}
