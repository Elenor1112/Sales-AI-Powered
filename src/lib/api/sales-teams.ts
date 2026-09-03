import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { SalesTeamWithMemberCount, SalesTeamMemberWithUser } from "@/types/sales-team";

export function listTeams() {
  return apiGet<{ teams: SalesTeamWithMemberCount[] }>("/api/sales-teams");
}

export function createTeam(data: { name: string; description?: string }) {
  return apiPost<{ team: SalesTeamWithMemberCount }>("/api/sales-teams", data);
}

export function updateTeam(id: string, data: Record<string, unknown>) {
  return apiPatch(`/api/sales-teams/${id}`, data);
}

export function deleteTeam(id: string) {
  return apiDelete(`/api/sales-teams/${id}`);
}

export function listTeamMembers(teamId: string) {
  return apiGet<{ members: SalesTeamMemberWithUser[] }>(`/api/sales-teams/${teamId}/members`);
}

export function addTeamMember(teamId: string, data: { userId: string; assignmentWeight?: number; maxActiveLeads?: number | null }) {
  return apiPost(`/api/sales-teams/${teamId}/members`, data);
}

export function updateTeamMember(
  teamId: string,
  userId: string,
  data: Partial<{ isActive: boolean; isPaused: boolean; assignmentWeight: number; maxActiveLeads: number | null }>
) {
  return apiPatch(`/api/sales-teams/${teamId}/members/${userId}`, data);
}

export function removeTeamMember(teamId: string, userId: string) {
  return apiDelete(`/api/sales-teams/${teamId}/members/${userId}`);
}
