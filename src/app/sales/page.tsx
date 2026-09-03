"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, UserX, UserCheck, ListChecks, ArrowRight } from "lucide-react";

import { MetricCard } from "@/components/sales/MetricCard";
import { LeadStatusBadge } from "@/components/sales/LeadStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeadAnalytics } from "@/lib/api/analytics";
import { listLeads } from "@/lib/api/leads";
import { listTasks } from "@/lib/api/tasks";

export default function DashboardPage() {
  const analyticsQuery = useQuery({
    queryKey: ["lead-analytics", {}],
    queryFn: () => getLeadAnalytics(),
  });

  const recentLeadsQuery = useQuery({
    queryKey: ["leads", { page: 1, pageSize: 5, sortBy: "createdAt", sortDir: "desc" }],
    queryFn: () => listLeads({ page: 1, pageSize: 5, sortBy: "createdAt", sortDir: "desc" }),
  });

  const activeTasksQuery = useQuery({
    queryKey: ["tasks", { status: "PENDING", pageSize: 1 }],
    queryFn: () => listTasks({ status: "PENDING", pageSize: 1 }),
  });

  const isLoading = analyticsQuery.isLoading || recentLeadsQuery.isLoading;

  if (analyticsQuery.isError) {
    return (
      <Card className="glass-panel border-0">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Failed to load dashboard data.</p>
          <Button variant="outline" size="sm" onClick={() => analyticsQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const unassignedCount = analyticsQuery.data?.unassignedLeads ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your sales pipeline and activity.</p>
      </div>

      {unassignedCount > 0 && (
        <Alert>
          <UserX className="size-4" />
          <AlertTitle>{unassignedCount} unassigned lead{unassignedCount === 1 ? "" : "s"}</AlertTitle>
          <AlertDescription>
            <Link href="/sales/unassigned" className="font-medium text-primary hover:underline">
              Review the unassigned queue &rarr;
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total leads" value={analyticsQuery.data?.totalLeads ?? 0} icon={Users} />
          <MetricCard label="Unassigned" value={unassignedCount} icon={UserX} />
          <MetricCard label="Assigned" value={analyticsQuery.data?.assignedLeads ?? 0} icon={UserCheck} />
          <MetricCard
            label="Active tasks"
            value={activeTasksQuery.data?.total ?? 0}
            icon={ListChecks}
          />
        </div>
      )}

      <Card className="glass-panel border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent leads</CardTitle>
          <Link href="/sales/leads" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentLeadsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentLeadsQuery.data?.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <ul className="divide-y">
              {recentLeadsQuery.data?.items.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/sales/leads/${lead.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{lead.source}</p>
                  </Link>
                  <LeadStatusBadge status={lead.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
