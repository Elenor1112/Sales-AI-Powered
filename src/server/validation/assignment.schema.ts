import { z } from "zod";

export const assignmentStrategyEnum = z.enum([
  "ROUND_ROBIN",
  "LEAST_ASSIGNED",
  "WEIGHTED_ROUND_ROBIN",
  "MANUAL",
]);

export const leadSourceEnum = z.enum(["META", "FACEBOOK", "INSTAGRAM", "WEBSITE", "MANUAL", "OTHER"]);

export const createAssignmentRuleSchema = z
  .object({
    name: z.string().min(1).max(200),
    priority: z.number().int().min(1).max(100000),
    isActive: z.boolean().optional(),
    source: leadSourceEnum.optional(),
    metaPageId: z.string().optional(),
    metaFormId: z.string().optional(),
    metaCampaignId: z.string().optional(),
    metaAdSetId: z.string().optional(),
    metaAdId: z.string().optional(),
    conditions: z.record(z.string(), z.unknown()).optional(),
    teamId: z.string().min(1, "Assignment rule requires a team"),
    strategy: assignmentStrategyEnum,
  })
  .refine(
    (rule) =>
      rule.source || rule.metaPageId || rule.metaFormId || rule.metaCampaignId || rule.metaAdSetId || rule.metaAdId,
    { message: "Rule must specify at least one matching criterion (source, page, form, campaign, ad set, or ad)" }
  );

export const updateAssignmentRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  priority: z.number().int().min(1).max(100000).optional(),
  isActive: z.boolean().optional(),
  source: leadSourceEnum.nullable().optional(),
  metaPageId: z.string().nullable().optional(),
  metaFormId: z.string().nullable().optional(),
  metaCampaignId: z.string().nullable().optional(),
  metaAdSetId: z.string().nullable().optional(),
  metaAdId: z.string().nullable().optional(),
  conditions: z.record(z.string(), z.unknown()).nullable().optional(),
  teamId: z.string().min(1).optional(),
  strategy: assignmentStrategyEnum.optional(),
});

export const assignLeadSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  teamId: z.string().optional(),
  reason: z.string().max(2000).optional(),
});

export const reassignLeadSchema = assignLeadSchema;

export type CreateAssignmentRuleInput = z.infer<typeof createAssignmentRuleSchema>;
export type UpdateAssignmentRuleInput = z.infer<typeof updateAssignmentRuleSchema>;
