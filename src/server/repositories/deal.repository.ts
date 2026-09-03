import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DealQueryInput } from "@/server/validation/deal.schema";
import { paginationToSkipTake } from "@/lib/pagination";

export async function findManyDeals(organizationId: string, query: DealQueryInput) {
  const where: Prisma.DealWhereInput = { organizationId };
  if (query.stage) where.stage = query.stage;
  if (query.ownerId) where.ownerId = query.ownerId;

  const { skip, take } = paginationToSkipTake(query);
  const [items, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    }),
    prisma.deal.count({ where }),
  ]);

  return { items, total };
}

export function findDealById(organizationId: string, dealId: string) {
  return prisma.deal.findFirst({ where: { id: dealId, organizationId } });
}

export function createDeal(organizationId: string, data: Prisma.DealUncheckedCreateInput) {
  return prisma.deal.create({ data: { ...data, organizationId } });
}

export function updateDeal(organizationId: string, dealId: string, data: Prisma.DealUncheckedUpdateInput) {
  return prisma.deal.update({ where: { id: dealId, organizationId }, data });
}
