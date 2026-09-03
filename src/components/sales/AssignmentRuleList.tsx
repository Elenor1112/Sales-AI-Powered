"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AssignmentRuleForm } from "./AssignmentRuleForm";
import { deleteAssignmentRule } from "@/lib/api/assignment";
import { ClientApiError } from "@/lib/api/client";
import type { AssignmentRuleWithTeam } from "@/types/assignment";

function matchingCriteria(rule: AssignmentRuleWithTeam) {
  const parts: string[] = [];
  if (rule.source) parts.push(`Source: ${rule.source}`);
  if (rule.metaPageId) parts.push(`Page: ${rule.metaPageId}`);
  if (rule.metaFormId) parts.push(`Form: ${rule.metaFormId}`);
  if (rule.metaCampaignId) parts.push(`Campaign: ${rule.metaCampaignId}`);
  if (rule.metaAdSetId) parts.push(`Ad set: ${rule.metaAdSetId}`);
  if (rule.metaAdId) parts.push(`Ad: ${rule.metaAdId}`);
  return parts.length > 0 ? parts.join(", ") : "Any lead";
}

function DeleteRuleDialog({ rule }: { rule: AssignmentRuleWithTeam }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteAssignmentRule(rule.id),
    onSuccess: () => {
      toast.success("Rule deleted");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["assignment-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to delete rule");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Delete rule" />}>
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete assignment rule</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{rule.name}&quot;? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignmentRuleList({ rules }: { rules: AssignmentRuleWithTeam[] }) {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No assignment rules yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a rule to route specific leads to a team automatically.
        </p>
      </div>
    );
  }

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Priority</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Strategy</TableHead>
            <TableHead>Matches</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="tabular-nums">{rule.priority}</TableCell>
              <TableCell className="font-medium">{rule.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.team.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.strategy.replaceAll("_", " ")}</TableCell>
              <TableCell className="max-w-56 truncate text-sm text-muted-foreground" title={matchingCriteria(rule)}>
                {matchingCriteria(rule)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    rule.isActive
                      ? "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  }
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <AssignmentRuleForm
                    rule={rule}
                    trigger={
                      <Button size="icon-sm" variant="ghost" aria-label="Edit rule">
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <DeleteRuleDialog rule={rule} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
