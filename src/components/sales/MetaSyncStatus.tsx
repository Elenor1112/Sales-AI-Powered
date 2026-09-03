"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { triggerMetaSync } from "@/lib/api/meta";
import { ClientApiError } from "@/lib/api/client";
import type { MetaSyncSummary } from "@/lib/api/meta";

export function MetaSyncStatus({ recentSyncs }: { recentSyncs: MetaSyncSummary[] }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => triggerMetaSync(),
    onSuccess: (data) => {
      const result = data.result as Record<string, unknown>;
      const fetched = result.leadsFetched ?? 0;
      const created = result.leadsCreated ?? 0;
      const assigned = result.leadsAssigned ?? 0;
      toast.success(`Sync complete: ${fetched} fetched, ${created} created, ${assigned} assigned`);
      queryClient.invalidateQueries({ queryKey: ["meta-status"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Sync failed");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Sync status</CardTitle>
        <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          <RefreshCw className={`size-3.5 ${mutation.isPending ? "animate-spin" : ""}`} />
          {mutation.isPending ? "Syncing..." : "Sync now"}
        </Button>
      </CardHeader>
      <CardContent>
        {recentSyncs.length === 0 ? (
          <p className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            No syncs yet. Trigger a sync to pull in new leads.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Fetched</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSyncs.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell className="text-sm text-muted-foreground">{sync.mode}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          sync.status === "SUCCESS" || sync.status === "COMPLETED"
                            ? "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : sync.status === "FAILED"
                            ? "border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }
                      >
                        {sync.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{sync.leadsFetched}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{sync.leadsCreated}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{sync.leadsAssigned}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(sync.startedAt), "MMM d, p")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
