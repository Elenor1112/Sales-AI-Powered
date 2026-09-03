import { apiGet, buildQuery } from "./client";

export interface LeadAnalytics {
  totalLeads: number;
  leadsBySource: { source: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  leadsBySalesperson: { userId: string | null; count: number }[];
  leadsByTeam: { teamId: string | null; count: number }[];
  assignedLeads: number;
  unassignedLeads: number;
  assignmentFailureCount: number;
  averageTimeToAssignmentSeconds: number | string | null;
}

export interface AssignmentAnalytics {
  assignedPerSalesperson: { userId: string | null; name: string | null; count: number }[];
  assignedPerTeam: { teamId: string | null; name: string | null; count: number }[];
  assignedByStrategy: { method: string; count: number }[];
  unassignedLeadCount: number;
  reassignmentCount: number;
  capacityUtilization: { userId: string; utilization: number }[];
}

export function getLeadAnalytics(range: { dateFrom?: string; dateTo?: string } = {}) {
  return apiGet<LeadAnalytics>(`/api/sales/analytics${buildQuery(range)}`);
}

export function getConversionAnalytics(range: { dateFrom?: string; dateTo?: string; groupBy?: string } = {}) {
  return apiGet<{ conversion: Record<string, unknown>[] }>(
    `/api/sales/analytics${buildQuery({ ...range, metric: "conversion" })}`
  );
}

export function getRevenueAnalytics(range: { dateFrom?: string; dateTo?: string } = {}) {
  return apiGet<{ revenue: Record<string, unknown> }>(
    `/api/sales/analytics${buildQuery({ ...range, metric: "revenue" })}`
  );
}

export function getAssignmentAnalytics(range: { dateFrom?: string; dateTo?: string } = {}) {
  return apiGet<AssignmentAnalytics>(`/api/sales/analytics/assignments${buildQuery(range)}`);
}
