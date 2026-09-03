import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { notify } from "@/server/notifications/dispatcher";
import * as dealRepo from "@/server/repositories/deal.repository";
import type { CreateDealInput, DealQueryInput, UpdateDealInput } from "@/server/validation/deal.schema";

export function listDeals(organizationId: string, query: DealQueryInput) {
  return dealRepo.findManyDeals(organizationId, query);
}

export async function getDeal(organizationId: string, dealId: string) {
  const deal = await dealRepo.findDealById(organizationId, dealId);
  if (!deal) throw new NotFoundError("Deal not found");
  return deal;
}

export async function createDeal(organizationId: string, createdByUserId: string, input: CreateDealInput) {
  const owner = await prisma.user.findFirst({ where: { id: input.ownerId, organizationId } });
  if (!owner) throw new ValidationError("ownerId must reference a user in this organization");

  const deal = await dealRepo.createDeal(organizationId, {
    organizationId,
    leadId: input.leadId,
    ownerId: input.ownerId,
    name: input.name,
    value: input.value,
    currency: input.currency ?? "USD",
    stage: input.stage ?? "QUALIFICATION",
    expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
    probability: input.probability,
  });

  if (input.leadId) {
    await prisma.leadActivity.create({
      data: {
        organizationId,
        leadId: input.leadId,
        userId: createdByUserId,
        activityType: "DEAL_CREATED",
        metadata: { dealId: deal.id, name: deal.name },
      },
    });
  }

  return deal;
}

export async function updateDeal(organizationId: string, dealId: string, userId: string, input: UpdateDealInput) {
  const existing = await getDeal(organizationId, dealId);

  const data: Record<string, unknown> = { ...input };
  if (input.expectedCloseDate !== undefined) {
    data.expectedCloseDate = input.expectedCloseDate ? new Date(input.expectedCloseDate) : null;
  }
  if (input.stage === "WON" && existing.stage !== "WON") data.wonAt = new Date();
  if (input.stage === "LOST" && existing.stage !== "LOST") data.lostAt = new Date();

  const updated = await dealRepo.updateDeal(organizationId, dealId, data);

  if (existing.leadId) {
    await prisma.leadActivity.create({
      data: {
        organizationId,
        leadId: existing.leadId,
        userId,
        activityType: "DEAL_UPDATED",
        metadata: { dealId, changes: input },
      },
    });
  }

  if (input.stage === "WON" && existing.stage !== "WON") {
    await notify({
      organizationId,
      userId: existing.ownerId,
      type: "DEAL_WON",
      title: "Deal won!",
      message: `${existing.name} has been marked as won.`,
      metadata: { dealId },
    });
  } else if (input.stage === "LOST" && existing.stage !== "LOST") {
    await notify({
      organizationId,
      userId: existing.ownerId,
      type: "DEAL_LOST",
      title: "Deal lost",
      message: `${existing.name} has been marked as lost.`,
      metadata: { dealId },
    });
  }

  return updated;
}
