"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WinLossChart } from "./WinLossChart";
import { RevenueChart } from "./RevenueChart";
import { SourceBreakdown } from "./SourceBreakdown";
import { AssignmentAnalytics } from "./AssignmentAnalytics";
import { getLeadAnalytics, getRevenueAnalytics, getAssignmentAnalytics } from "@/lib/api/analytics";

export function AnalyticsCharts({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const range = { dateFrom, dateTo };

  const leadAnalytics = useQuery({
    queryKey: ["lead-analytics", range],
    queryFn: () => getLeadAnalytics(range),
  });

  const revenueAnalytics = useQuery({
    queryKey: ["revenue-analytics", range],
    queryFn: () => getRevenueAnalytics(range),
  });

  const assignmentAnalytics = useQuery({
    queryKey: ["assignment-analytics", range],
    queryFn: () => getAssignmentAnalytics(range),
  });

  if (leadAnalytics.isLoading || revenueAnalytics.isLoading || assignmentAnalytics.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (leadAnalytics.isError || revenueAnalytics.isError || assignmentAnalytics.isError) {
    return (
      <Card className="glass-panel border-0">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Failed to load analytics.</p>
          <button
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => {
              leadAnalytics.refetch();
              revenueAnalytics.refetch();
              assignmentAnalytics.refetch();
            }}
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const wonCount = leadAnalytics.data?.leadsByStatus.find((s) => s.status === "WON")?.count ?? 0;
  const lostCount = leadAnalytics.data?.leadsByStatus.find((s) => s.status === "LOST")?.count ?? 0;

  const revenue = revenueAnalytics.data?.revenue as
    | { revenueBySalesperson?: { userId: string | null; revenue: number }[] }
    | undefined;
  const revenueBySalesperson = (revenue?.revenueBySalesperson ?? []).map((r) => ({
    userId: r.userId,
    label: r.userId ? `User ${r.userId.slice(-6)}` : "Unassigned",
    revenue: r.revenue,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card relative overflow-hidden rounded-xl p-6">
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-tertiary/10 blur-xl" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Won</p>
          <p className="mt-2 text-3xl font-bold text-tertiary glow-text">{wonCount}</p>
        </div>
        <div className="glass-card relative overflow-hidden rounded-xl p-6">
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-destructive/10 blur-xl" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Lost</p>
          <p className="mt-2 text-3xl font-bold text-destructive">{lostCount}</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <WinLossChart won={wonCount} lost={lostCount} />
        <RevenueChart data={revenueBySalesperson} />
        <SourceBreakdown data={leadAnalytics.data?.leadsBySource ?? []} />
      </div>
      {assignmentAnalytics.data && <AssignmentAnalytics data={assignmentAnalytics.data} />}
    </div>
  );
}
