import { apiGet, apiPatch, apiPost, apiDelete } from "./client";
import type { AssignmentRuleWithTeam, WorkloadEntry } from "@/types/assignment";
import type { AssignmentSettings } from "@prisma/client";

export function getAssignmentSettings() {
  return apiGet<{ settings: AssignmentSettings }>("/api/assignment/settings");
}

export function updateAssignmentSettings(data: Partial<AssignmentSettings>) {
  return apiPatch<{ settings: AssignmentSettings }>("/api/assignment/settings", data);
}

export function listAssignmentRules() {
  return apiGet<{ rules: AssignmentRuleWithTeam[] }>("/api/assignment/rules");
}

export function createAssignmentRule(data: Record<string, unknown>) {
  return apiPost<{ rule: AssignmentRuleWithTeam }>("/api/assignment/rules", data);
}

export function updateAssignmentRule(id: string, data: Record<string, unknown>) {
  return apiPatch<{ rule: AssignmentRuleWithTeam }>(`/api/assignment/rules/${id}`, data);
}

export function deleteAssignmentRule(id: string) {
  return apiDelete(`/api/assignment/rules/${id}`);
}

export function getWorkload() {
  return apiGet<{ workload: WorkloadEntry[] }>("/api/assignment/workload");
}
