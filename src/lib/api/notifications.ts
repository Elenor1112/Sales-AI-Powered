import { apiGet, apiPost, buildQuery } from "./client";
import type { PaginatedResponse } from "@/types/sales";
import type { Notification } from "@prisma/client";

export function listNotifications(unreadOnly = false) {
  return apiGet<PaginatedResponse<Notification>>(`/api/notifications${buildQuery({ unreadOnly, pageSize: 20 })}`);
}

export function markNotificationRead(id: string) {
  return apiPost(`/api/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return apiPost<{ updatedCount: number }>("/api/notifications/read-all");
}
