import { apiGet, apiPost, apiPatch, apiDelete, buildQuery } from "./client";
import type { PaginatedResponse } from "@/types/sales";
import type { LeadWithRelations, LeadActivityWithUser } from "@/types/lead";
import type { AssignmentHistoryWithNames, UnassignedLeadEntry } from "@/types/assignment";

export interface LeadFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  assignedUserId?: string;
  assignedTeamId?: string;
  assignmentStatus?: string;
  source?: string;
  status?: string;
  priority?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  [key: string]: string | number | boolean | undefined;
}

export function listLeads(filters: LeadFilters) {
  return apiGet<PaginatedResponse<LeadWithRelations>>(`/api/leads${buildQuery(filters)}`);
}

export function getLead(id: string) {
  return apiGet<{ lead: LeadWithRelations }>(`/api/leads/${id}`);
}

export function createLead(data: Record<string, unknown>) {
  return apiPost<{ lead: LeadWithRelations }>("/api/leads", data);
}

export function updateLead(id: string, data: Record<string, unknown>) {
  return apiPatch<{ lead: LeadWithRelations }>(`/api/leads/${id}`, data);
}

export function deleteLead(id: string) {
  return apiDelete<{ success: boolean }>(`/api/leads/${id}`);
}

export function changeLeadStatus(id: string, status: string, lostReason?: string) {
  return apiPost<{ lead: LeadWithRelations }>(`/api/leads/${id}/status`, { status, lostReason });
}

export function assignLead(id: string, userId: string, teamId?: string, reason?: string) {
  return apiPost(`/api/leads/${id}/assign`, { userId, teamId, reason });
}

export function reassignLead(id: string, userId: string, teamId?: string, reason?: string) {
  return apiPost(`/api/leads/${id}/reassign`, { userId, teamId, reason });
}

export function getLeadAssignmentHistory(id: string) {
  return apiGet<{ history: AssignmentHistoryWithNames[] }>(`/api/leads/${id}/assignment-history`);
}

export function getLeadActivities(id: string) {
  return apiGet<{ activities: LeadActivityWithUser[] }>(`/api/leads/${id}/activities`);
}

export function addLeadNote(id: string, content: string) {
  return apiPost(`/api/leads/${id}/notes`, { content });
}

export function addLeadTags(id: string, tagNames: string[]) {
  return apiPost(`/api/leads/${id}/tags`, { tagNames });
}

export function listUnassignedLeads() {
  return apiGet<{ leads: UnassignedLeadEntry[] }>("/api/leads/unassigned");
}

export function retryAssignment(leadId: string) {
  return apiPost(`/api/assignment/retry/${leadId}`);
}
