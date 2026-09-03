"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeadFilters } from "@/components/sales/LeadFilters";
import { LeadTable, LeadTableSkeleton } from "@/components/sales/LeadTable";
import { listLeads, type LeadFilters as LeadFiltersType } from "@/lib/api/leads";
import { NewLeadDialog } from "./new-lead-dialog";

export default function LeadsPage() {
  const [filters, setFilters] = useState<LeadFiltersType>({ page: 1, pageSize: 20 });

  const leadsQuery = useQuery({
    queryKey: ["leads", filters],
    queryFn: () => listLeads(filters),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">Manage and track all leads in your pipeline.</p>
        </div>
        <NewLeadDialog />
      </div>

      <LeadFilters filters={filters} onChange={setFilters} />

      {leadsQuery.isLoading ? (
        <LeadTableSkeleton />
      ) : leadsQuery.isError ? (
        <Card className="glass-panel border-0">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Failed to load leads.</p>
            <Button variant="outline" size="sm" onClick={() => leadsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <LeadTable leads={leadsQuery.data?.items ?? []} />
          {leadsQuery.data && leadsQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Page {leadsQuery.data.page} of {leadsQuery.data.totalPages} &middot; {leadsQuery.data.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={leadsQuery.data.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={leadsQuery.data.page >= leadsQuery.data.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
