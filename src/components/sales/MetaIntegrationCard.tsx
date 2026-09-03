"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { disconnectMeta } from "@/lib/api/meta";
import { ClientApiError } from "@/lib/api/client";
import type { MetaStatus } from "@/lib/api/meta";

function DisconnectDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => disconnectMeta(),
    onSuccess: () => {
      toast.success("Meta account disconnected");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["meta-status"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to disconnect");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Disconnect</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Meta account</DialogTitle>
          <DialogDescription>
            This will stop syncing new leads from Facebook and Instagram Lead Ads. Existing leads will not be
            affected. You can reconnect at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MetaIntegrationCard({ status }: { status: MetaStatus }) {
  if (!status.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-muted-foreground" />
            Meta integration
          </CardTitle>
          <CardDescription>Connect your Facebook/Instagram account to automatically import leads.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/integrations/meta/connect">
            <Button>Connect Meta</Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-muted-foreground" />
            Meta integration
          </CardTitle>
          <CardDescription>Facebook and Instagram Lead Ads connection.</CardDescription>
        </div>
        <Badge
          variant="outline"
          className="gap-1 border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-3" /> Connected
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.lastError && (
          <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            <XCircle className="size-4 shrink-0" /> {status.lastError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{status.status ?? "Active"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Token expires</p>
            <p className="font-medium">
              {status.tokenExpiresAt ? format(new Date(status.tokenExpiresAt), "MMM d, yyyy p") : "—"}
            </p>
          </div>
        </div>

        {status.pages && status.pages.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Connected pages</p>
            <ul className="space-y-2">
              {status.pages.map((page) => (
                <li key={page.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{page.name}</p>
                    <Badge variant={page.isSubscribed ? "outline" : "secondary"} className="text-xs">
                      {page.isSubscribed ? "Subscribed" : "Not subscribed"}
                    </Badge>
                  </div>
                  {page.forms.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Forms: {page.forms.map((f) => f.name).join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <DisconnectDialog />
        </div>
      </CardContent>
    </Card>
  );
}
