import { apiGet, apiPost, apiPatch, buildQuery } from "./client";
import type { PaginatedResponse } from "@/types/sales";
import type { Task } from "@prisma/client";

export interface TaskWithRelations extends Task {
  assignedUser?: { id: string; name: string } | null;
  lead?: { id: string; name: string } | null;
}

export function listTasks(filters: Record<string, string | number | boolean | undefined> = {}) {
  return apiGet<PaginatedResponse<TaskWithRelations>>(`/api/tasks${buildQuery(filters)}`);
}

export function createTask(data: Record<string, unknown>) {
  return apiPost<{ task: TaskWithRelations }>("/api/tasks", data);
}

export function updateTask(id: string, data: Record<string, unknown>) {
  return apiPatch<{ task: TaskWithRelations }>(`/api/tasks/${id}`, data);
}

export function completeTask(id: string) {
  return apiPost<{ task: TaskWithRelations }>(`/api/tasks/${id}/complete`);
}
