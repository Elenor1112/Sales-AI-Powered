"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserSelect } from "./UserSelect";
import { retryAssignment, assignLead } from "@/lib/api/leads";
import { ClientApiError } from "@/lib/api/client";
import type { UnassignedLeadEntry } from "@/types/assignment";

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["unassigned-leads"] });
  queryClient.invalidateQueries({ queryKey: ["leads"] });
  queryClient.invalidateQueries({ queryKey: ["workload"] });
  queryClient.invalidateQueries({ queryKey: ["lead-analytics"] });
}

function AssignDialog({ lead }: { lead: UnassignedLeadEntry }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Select a salesperson first");
      return assignLead(lead.id, userId);
    },
    onSuccess: () => {
      toast.success(`${lead.name} assigned`);
      setOpen(false);
      invalidateAll(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to assign lead");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Assign manually</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign {lead.name}</DialogTitle>
          <DialogDescription>Choose a salesperson to manually assign this lead to.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Salesperson</Label>
          <UserSelect value={userId} onChange={setUserId} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!userId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RetryButton({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => retryAssignment(leadId),
    onSuccess: () => {
      toast.success("Assignment retried");
      invalidateAll(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Retry failed");
    },
  });

  return (
    <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? "Retrying..." : "Retry"}
    </Button>
  );
}

export function UnassignedLeadQueue({ leads }: { leads: UnassignedLeadEntry[] }) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No unassigned leads</p>
        <p className="mt-1 text-sm text-muted-foreground">All leads currently have an assignee. Nice work.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Waiting for</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Failure reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <Link href={`/sales/leads/${lead.id}`} className="font-medium hover:underline">
                  {lead.name}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{lead.source}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistance(0, lead.waitingMs)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    lead.assignmentStatus === "REASSIGNMENT_REQUIRED"
                      ? "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  }
                >
                  {lead.assignmentStatus.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={lead.failureReason ?? undefined}>
                {lead.failureReason ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <RetryButton leadId={lead.id} />
                  <AssignDialog lead={lead} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
