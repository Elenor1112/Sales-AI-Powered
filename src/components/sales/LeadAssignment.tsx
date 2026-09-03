"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { UserSelect } from "./UserSelect";
import { AssignmentFailureAlert } from "./AssignmentFailureAlert";
import { assignLead, reassignLead } from "@/lib/api/leads";
import { ClientApiError } from "@/lib/api/client";
import type { LeadWithRelations, LeadActivityWithUser } from "@/types/lead";

export function LeadAssignment({
  lead,
  activities,
}: {
  lead: LeadWithRelations;
  activities?: LeadActivityWithUser[];
}) {
  const { data: session } = useSession();
  const canManage = session?.user?.role === "ADMIN" || session?.user?.role === "SALES_MANAGER";

  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(lead.assignedUserId ?? undefined);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const isUnassigned = lead.assignmentStatus === "UNASSIGNED" || lead.assignmentStatus === "REASSIGNMENT_REQUIRED";

  const mutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Select a salesperson first");
      return isUnassigned
        ? assignLead(lead.id, userId, undefined, reason || undefined)
        : reassignLead(lead.id, userId, undefined, reason || undefined);
    },
    onSuccess: () => {
      toast.success(isUnassigned ? "Lead assigned" : "Lead reassigned");
      setOpen(false);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["lead-assignment-history", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-leads"] });
      queryClient.invalidateQueries({ queryKey: ["workload"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to update assignment");
    },
  });

  const failureReason = activities?.find((a) => a.activityType === "ASSIGNMENT_FAILED")
    ? ((activities.find((a) => a.activityType === "ASSIGNMENT_FAILED")?.metadata as Record<string, unknown> | null)
        ?.reason as string | undefined)
    : undefined;

  return (
    <div className="space-y-3">
      {isUnassigned && (
        <AssignmentFailureAlert reason={failureReason ?? "This lead has not been assigned to a salesperson yet."} />
      )}

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Assignee</p>
          <p className="font-medium">{lead.assignedUser?.name ?? "Unassigned"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Team</p>
          <p className="font-medium">{lead.assignedTeam?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Method</p>
          <p className="font-medium">{lead.assignmentMethod?.replaceAll("_", " ") ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className="font-medium">{lead.assignmentStatus.replaceAll("_", " ")}</p>
        </div>
      </div>

      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            {isUnassigned ? "Assign" : "Reassign"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isUnassigned ? "Assign lead" : "Reassign lead"}</DialogTitle>
              <DialogDescription>
                Choose a salesperson to {isUnassigned ? "assign" : "reassign"} this lead to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Salesperson</Label>
                <UserSelect value={userId} onChange={setUserId} />
              </div>
              <div className="space-y-1.5">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this assignment changing?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!userId || mutation.isPending} onClick={() => mutation.mutate()}>
                {mutation.isPending ? "Saving..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
