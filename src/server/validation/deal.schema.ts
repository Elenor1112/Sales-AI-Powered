import { z } from "zod";

export const dealStageEnum = z.enum(["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]);

export const createDealSchema = z.object({
  leadId: z.string().optional(),
  ownerId: z.string().min(1),
  name: z.string().min(1).max(300),
  value: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  stage: dealStageEnum.optional(),
  expectedCloseDate: z.string().datetime().optional(),
  probability: z.number().int().min(0).max(100).optional(),
});

export const updateDealSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  value: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  stage: dealStageEnum.optional(),
  expectedCloseDate: z.string().datetime().nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  ownerId: z.string().optional(),
});

export const dealQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  stage: dealStageEnum.optional(),
  ownerId: z.string().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type DealQueryInput = z.infer<typeof dealQuerySchema>;
