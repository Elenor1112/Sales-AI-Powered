"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetaIntegrationCard } from "@/components/sales/MetaIntegrationCard";
import { MetaSyncStatus } from "@/components/sales/MetaSyncStatus";
import { getMetaStatus } from "@/lib/api/meta";

export default function MetaIntegrationPage() {
  const statusQuery = useQuery({
    queryKey: ["meta-status"],
    queryFn: () => getMetaStatus(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meta integration</h1>
        <p className="text-sm text-muted-foreground">
          Connect Facebook and Instagram Lead Ads to automatically pull in new leads and route them to your sales
          team based on your assignment rules.
        </p>
      </div>

      {statusQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : statusQuery.isError || !statusQuery.data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Failed to load Meta integration status.</p>
            <Button variant="outline" size="sm" onClick={() => statusQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <MetaIntegrationCard status={statusQuery.data} />
          {statusQuery.data.connected && <MetaSyncStatus recentSyncs={statusQuery.data.recentSyncs ?? []} />}
        </div>
      )}
    </div>
  );
}
