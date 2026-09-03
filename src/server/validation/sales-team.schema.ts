import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1),
  assignmentWeight: z.number().int().positive().max(1000).optional(),
  maxActiveLeads: z.number().int().positive().max(100000).nullable().optional(),
});

export const updateTeamMemberSchema = z.object({
  isActive: z.boolean().optional(),
  isPaused: z.boolean().optional(),
  assignmentWeight: z.number().int().positive().max(1000).optional(),
  maxActiveLeads: z.number().int().positive().max(100000).nullable().optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
