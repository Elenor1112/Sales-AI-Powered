"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UnassignedLeadQueue } from "@/components/sales/UnassignedLeadQueue";
import { listUnassignedLeads } from "@/lib/api/leads";

export default function UnassignedPage() {
  const query = useQuery({
    queryKey: ["unassigned-leads"],
    queryFn: () => listUnassignedLeads(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Unassigned leads</h1>
        <p className="text-sm text-muted-foreground">
          Leads waiting for assignment. Retry automatic assignment or assign them manually.
        </p>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Failed to load unassigned leads.</p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <UnassignedLeadQueue leads={query.data?.leads ?? []} />
      )}
    </div>
  );
}
