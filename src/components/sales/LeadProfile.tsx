"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Phone, Building2, Flag } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { changeLeadStatus } from "@/lib/api/leads";
import { ClientApiError } from "@/lib/api/client";
import type { LeadWithRelations } from "@/types/lead";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const STATUS_OPTIONS = ["NEW", "ASSIGNED", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];

function formatCurrency(value: unknown, currency: string | null) {
  if (value === null || value === undefined) return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(numeric);
}

export function LeadProfile({ lead }: { lead: LeadWithRelations }) {
  const queryClient = useQueryClient();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [lostDialogOpen, setLostDialogOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (params: { status: string; lostReason?: string }) =>
      changeLeadStatus(lead.id, params.status, params.lostReason),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to update status");
    },
    onSettled: () => {
      setPendingStatus(null);
      setLostDialogOpen(false);
      setLostReason("");
    },
  });

  function handleStatusChange(value: string) {
    if (value === lead.status) return;
    if (value === "LOST") {
      setPendingStatus(value);
      setLostDialogOpen(true);
      return;
    }
    mutation.mutate({ status: value });
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-col items-start justify-between gap-4 rounded-xl p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 border-2 border-primary">
            <AvatarFallback className="text-lg">{initials(lead.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" /> {lead.email}
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" /> {lead.phone}
                </span>
              )}
              {lead.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5" /> {lead.company}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Flag className="size-3.5" /> {lead.priority}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Status</Label>
          <Select
            value={pendingStatus ?? lead.status}
            onValueChange={(v) => {
              if (v) handleStatusChange(v);
            }}
            disabled={mutation.isPending}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {lead.status === "LOST" && lead.lostReason && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Lost reason: {lead.lostReason}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-panel rounded-xl p-6">
          <h2 className="mb-4 border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Source
          </h2>
          <p className="font-medium">{lead.source}</p>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <h2 className="mb-4 border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Job title
          </h2>
          <p className="font-medium">{lead.jobTitle ?? "—"}</p>
        </div>
        <div className="glass-panel rounded-xl bg-gradient-to-br from-card to-muted p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Deal Potential
          </h2>
          <p className="glow-text text-3xl font-bold text-tertiary">
            {formatCurrency(lead.estimatedValue, lead.currency)}
          </p>
        </div>
      </div>

      <Dialog
        open={lostDialogOpen}
        onOpenChange={(next) => {
          setLostDialogOpen(next);
          if (!next) setPendingStatus(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark lead as lost</DialogTitle>
            <DialogDescription>Please provide a reason this lead was lost.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="e.g. Went with a competitor, budget cut, unresponsive..."
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLostDialogOpen(false);
                setPendingStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!lostReason.trim() || mutation.isPending}
              onClick={() => mutation.mutate({ status: "LOST", lostReason: lostReason.trim() })}
            >
              {mutation.isPending ? "Saving..." : "Mark as lost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
