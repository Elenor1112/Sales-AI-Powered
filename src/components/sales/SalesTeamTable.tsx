"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CapacityIndicator } from "./CapacityIndicator";
import { updateTeamMember } from "@/lib/api/sales-teams";
import { ClientApiError } from "@/lib/api/client";
import type { WorkloadEntry } from "@/types/assignment";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function SalesTeamTable({ workload, canManage }: { workload: WorkloadEntry[]; canManage: boolean }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (params: { teamId: string; userId: string; isPaused: boolean }) =>
      updateTeamMember(params.teamId, params.userId, { isPaused: params.isPaused }),
    onSuccess: () => {
      toast.success("Member updated");
      queryClient.invalidateQueries({ queryKey: ["workload"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to update member");
    },
  });

  if (workload.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No team members yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Add salespeople to a team to see them here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Last assigned</TableHead>
            <TableHead className="text-right">Total assigned</TableHead>
            <TableHead className="text-right">Won</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workload.map((member) => (
            <TableRow key={member.userId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{member.teamName}</TableCell>
              <TableCell>
                <Switch
                  checked={!member.isPaused}
                  disabled={!canManage || toggleMutation.isPending}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ teamId: member.teamId, userId: member.userId, isPaused: !checked })
                  }
                  aria-label={member.isPaused ? "Resume assignments" : "Pause assignments"}
                />
              </TableCell>
              <TableCell>
                <CapacityIndicator active={member.activeLeadCount} max={member.maxActiveLeads} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {member.lastAssignedAt ? formatDistanceToNow(new Date(member.lastAssignedAt), { addSuffix: true }) : "Never"}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">{member.totalAssignedCount}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{member.wonLeadCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
