"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { addTeamMember } from "@/lib/api/sales-teams";
import { listTeamMembers } from "@/lib/api/sales-teams";
import { listOrgUsers } from "@/lib/api/users";
import { ClientApiError } from "@/lib/api/client";

export function AddMemberDialog({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [maxActiveLeads, setMaxActiveLeads] = useState("");
  const queryClient = useQueryClient();

  const usersQuery = useQuery({ queryKey: ["org-users"], queryFn: () => listOrgUsers() });
  const membersQuery = useQuery({ queryKey: ["team-members", teamId], queryFn: () => listTeamMembers(teamId) });

  const mutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Select a user first");
      return addTeamMember(teamId, {
        userId,
        maxActiveLeads: maxActiveLeads ? Number(maxActiveLeads) : null,
      });
    },
    onSuccess: () => {
      toast.success("Member added");
      setOpen(false);
      setUserId(undefined);
      setMaxActiveLeads("");
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["workload"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to add member");
    },
  });

  const existingMemberIds = new Set((membersQuery.data?.members ?? []).map((m) => m.userId));
  const candidates = (usersQuery.data?.users ?? []).filter((u) => !existingMemberIds.has(u.id));
  const isLoading = usersQuery.isLoading || membersQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserPlus className="size-3.5" /> Add member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Add an existing salesperson to this team. New user accounts must be created outside this screen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>User</Label>
            <Select value={userId} onValueChange={(v) => v && setUserId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoading ? "Loading..." : "Select a user"} />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No other users found</div>
                ) : (
                  candidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role.replaceAll("_", " ")})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Max active leads (optional)</Label>
            <Input
              type="number"
              value={maxActiveLeads}
              onChange={(e) => setMaxActiveLeads(e.target.value)}
              placeholder="No limit"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!userId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Adding..." : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
