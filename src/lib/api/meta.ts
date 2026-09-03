import { apiGet, apiPost } from "./client";

export interface MetaForm {
  id: string;
  metaFormId: string;
  name: string;
  status: string | null;
}

export interface MetaPage {
  id: string;
  metaPageId: string;
  name: string;
  isSubscribed: boolean;
  forms: MetaForm[];
}

export interface MetaSyncSummary {
  id: string;
  mode: string;
  status: string;
  leadsFetched: number;
  leadsCreated: number;
  leadsAssigned: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface MetaStatus {
  connected: boolean;
  status?: string;
  tokenExpiresAt?: string | null;
  lastError?: string | null;
  pages?: MetaPage[];
  recentSyncs?: MetaSyncSummary[];
}

export function getMetaStatus() {
  return apiGet<MetaStatus>("/api/integrations/meta/status");
}

export function triggerMetaSync() {
  return apiPost<{ result: Record<string, unknown> }>("/api/integrations/meta/sync");
}

export function disconnectMeta() {
  return apiPost<{ success: boolean }>("/api/integrations/meta/disconnect");
}
