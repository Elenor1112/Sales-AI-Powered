import { z } from "zod";
import { leadSourceEnum } from "./assignment.schema";

export const leadStatusEnum = z.enum([
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
]);

export const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const createLeadSchema = z.object({
  name: z.string().min(1).max(300),
  firstName: z.string().max(150).optional(),
  lastName: z.string().max(150).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  company: z.string().max(300).optional(),
  jobTitle: z.string().max(200).optional(),
  source: leadSourceEnum.optional(),
  priority: taskPriorityEnum.optional(),
  estimatedValue: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  firstName: z.string().max(150).nullable().optional(),
  lastName: z.string().max(150).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  company: z.string().max(300).nullable().optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  priority: taskPriorityEnum.optional(),
  estimatedValue: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const changeStatusSchema = z.object({
  status: leadStatusEnum,
  lostReason: z.string().max(1000).optional(),
});

export const addNoteSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const addTagsSchema = z.object({
  tagIds: z.array(z.string()).min(1).optional(),
  tagNames: z.array(z.string().min(1).max(100)).min(1).optional(),
}).refine((v) => v.tagIds?.length || v.tagNames?.length, {
  message: "Provide tagIds and/or tagNames",
});

export const leadQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  assignedUserId: z.string().optional(),
  assignedTeamId: z.string().optional(),
  assignmentStatus: z.enum(["UNASSIGNED", "ASSIGNED", "REASSIGNMENT_REQUIRED"]).optional(),
  source: leadSourceEnum.optional(),
  status: leadStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  metaCampaignId: z.string().optional(),
  metaFormId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "estimatedValue"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type LeadQueryInput = z.infer<typeof leadQuerySchema>;
