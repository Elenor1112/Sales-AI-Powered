"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineBoard } from "@/components/sales/PipelineBoard";
import { listDeals } from "@/lib/api/deals";
import { NewDealDialog } from "./new-deal-dialog";

export default function DealsPage() {
  const dealsQuery = useQuery({
    queryKey: ["deals", {}],
    queryFn: () => listDeals({ pageSize: 200 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground">Track deals across your pipeline stages.</p>
        </div>
        <NewDealDialog />
      </div>

      {dealsQuery.isLoading ? (
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0" />
          ))}
        </div>
      ) : dealsQuery.isError ? (
        <Card className="glass-panel border-0">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Failed to load deals.</p>
            <Button variant="outline" size="sm" onClick={() => dealsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <PipelineBoard deals={dealsQuery.data?.items ?? []} />
      )}
    </div>
  );
}
