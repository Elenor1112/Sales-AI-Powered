"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateDeal } from "@/lib/api/deals";
import type { DealWithRelations } from "@/lib/api/deals";
import { ClientApiError } from "@/lib/api/client";

const STAGES = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

function formatCurrency(value: unknown, currency: string | null | undefined) {
  if (value === null || value === undefined) return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(numeric);
}

export function DealCard({ deal }: { deal: DealWithRelations }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (stage: string) => updateDeal(deal.id, { stage }),
    onSuccess: () => {
      toast.success("Deal stage updated");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to update deal");
    },
  });

  return (
    <Card className="border border-white/10 bg-card/80 shadow-none transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="space-y-2 p-3">
        <Link href={`/sales/leads/${deal.leadId ?? ""}`} className="line-clamp-2 text-sm font-medium hover:text-primary hover:underline">
          {deal.name}
        </Link>
        <p className="text-lg font-bold tabular-nums">{formatCurrency(deal.value, deal.currency)}</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Owner: {deal.owner?.name ?? "Unassigned"}</p>
          <p>
            Close date:{" "}
            {deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), "MMM d, yyyy") : "—"}
          </p>
        </div>
        <Select
          value={deal.stage}
          onValueChange={(v) => {
            if (v) mutation.mutate(v);
          }}
          disabled={mutation.isPending}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
