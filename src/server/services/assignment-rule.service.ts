import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import * as ruleRepo from "@/server/repositories/assignment-rule.repository";
import type { CreateAssignmentRuleInput, UpdateAssignmentRuleInput } from "@/server/validation/assignment.schema";

function toJsonInput(value: Record<string, unknown> | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

async function assertTeamBelongsToOrg(organizationId: string, teamId: string) {
  const team = await prisma.salesTeam.findFirst({ where: { id: teamId, organizationId } });
  if (!team) {
    throw new ValidationError("teamId must reference a sales team in this organization");
  }
}

export function listRules(organizationId: string) {
  return ruleRepo.findManyRules(organizationId);
}

export async function createRule(organizationId: string, input: CreateAssignmentRuleInput) {
  await assertTeamBelongsToOrg(organizationId, input.teamId);
  return ruleRepo.createRule(organizationId, {
    organizationId,
    name: input.name,
    priority: input.priority,
    isActive: input.isActive ?? true,
    source: input.source,
    metaPageId: input.metaPageId,
    metaFormId: input.metaFormId,
    metaCampaignId: input.metaCampaignId,
    metaAdSetId: input.metaAdSetId,
    metaAdId: input.metaAdId,
    conditions: toJsonInput(input.conditions),
    teamId: input.teamId,
    strategy: input.strategy,
  });
}

export async function updateRule(
  organizationId: string,
  ruleId: string,
  input: UpdateAssignmentRuleInput
) {
  const existing = await ruleRepo.findRuleById(organizationId, ruleId);
  if (!existing) throw new NotFoundError("Assignment rule not found");
  if (input.teamId) {
    await assertTeamBelongsToOrg(organizationId, input.teamId);
  }
  return ruleRepo.updateRule(organizationId, ruleId, {
    ...input,
    conditions: toJsonInput(input.conditions),
  });
}

export async function deleteRule(organizationId: string, ruleId: string) {
  const existing = await ruleRepo.findRuleById(organizationId, ruleId);
  if (!existing) throw new NotFoundError("Assignment rule not found");
  return ruleRepo.deleteRule(organizationId, ruleId);
}
