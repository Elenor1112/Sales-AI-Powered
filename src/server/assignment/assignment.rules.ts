import type { AssignmentRule, LeadSource, Prisma } from "@prisma/client";

export interface LeadAttribution {
  source: LeadSource;
  metaPageId?: string | null;
  metaFormId?: string | null;
  metaCampaignId?: string | null;
  metaAdSetId?: string | null;
  metaAdId?: string | null;
}

export interface ResolvedRouting {
  teamId: string;
  strategy: AssignmentRule["strategy"] | null;
  ruleId: string | null;
}

function ruleMatches(rule: AssignmentRule, attribution: LeadAttribution): boolean {
  if (rule.source && rule.source !== attribution.source) return false;
  if (rule.metaPageId && rule.metaPageId !== attribution.metaPageId) return false;
  if (rule.metaFormId && rule.metaFormId !== attribution.metaFormId) return false;
  if (rule.metaCampaignId && rule.metaCampaignId !== attribution.metaCampaignId) return false;
  if (rule.metaAdSetId && rule.metaAdSetId !== attribution.metaAdSetId) return false;
  if (rule.metaAdId && rule.metaAdId !== attribution.metaAdId) return false;

  // A rule with no matching criteria at all would match everything, which is
  // almost certainly not intended — require at least one specific field.
  const hasCriteria =
    rule.source ||
    rule.metaPageId ||
    rule.metaFormId ||
    rule.metaCampaignId ||
    rule.metaAdSetId ||
    rule.metaAdId;
  return Boolean(hasCriteria);
}

/**
 * Resolves which team + strategy a lead should route to. Active rules are
 * evaluated in ascending priority order (lower number = higher priority);
 * the first match wins. If nothing matches, falls back to the organization's
 * default team/strategy from AssignmentSettings. Rules are always scoped by
 * organizationId at the query site (see assignment.service.ts).
 */
export async function resolveAssignmentRule(
  tx: Prisma.TransactionClient,
  organizationId: string,
  attribution: LeadAttribution
): Promise<ResolvedRouting | null> {
  const rules = await tx.assignmentRule.findMany({
    where: { organizationId, isActive: true },
    orderBy: { priority: "asc" },
  });

  for (const rule of rules) {
    if (ruleMatches(rule, attribution)) {
      return { teamId: rule.teamId, strategy: rule.strategy, ruleId: rule.id };
    }
  }

  return null;
}
