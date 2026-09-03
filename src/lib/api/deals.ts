import { apiGet, apiPost, apiPatch, buildQuery } from "./client";
import type { PaginatedResponse } from "@/types/sales";
import type { Deal } from "@prisma/client";

export interface DealWithRelations extends Deal {
  owner?: { id: string; name: string } | null;
  lead?: { id: string; name: string } | null;
}

export function listDeals(filters: Record<string, string | number | boolean | undefined> = {}) {
  return apiGet<PaginatedResponse<DealWithRelations>>(`/api/deals${buildQuery(filters)}`);
}

export function createDeal(data: Record<string, unknown>) {
  return apiPost<{ deal: DealWithRelations }>("/api/deals", data);
}

export function updateDeal(id: string, data: Record<string, unknown>) {
  return apiPatch<{ deal: DealWithRelations }>(`/api/deals/${id}`, data);
}
