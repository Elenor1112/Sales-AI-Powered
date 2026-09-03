import { DealCard } from "./DealCard";
import type { DealWithRelations } from "@/lib/api/deals";

const STAGE_LABELS: Record<string, string> = {
  QUALIFICATION: "Qualification",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

const STAGE_ACCENTS: Record<string, string> = {
  QUALIFICATION: "border-t-primary",
  PROPOSAL: "border-t-secondary",
  NEGOTIATION: "border-t-chart-5",
  WON: "border-t-tertiary",
  LOST: "border-t-destructive",
};

export function PipelineColumn({ stage, deals }: { stage: string; deals: DealWithRelations[] }) {
  const totalValue = deals.reduce((sum, deal) => sum + (deal.value ? Number(deal.value) : 0), 0);

  return (
    <div className={`glass-card flex w-72 shrink-0 flex-col rounded-xl border-t-4 ${STAGE_ACCENTS[stage] ?? ""}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <h3 className="text-sm font-semibold">{STAGE_LABELS[stage] ?? stage}</h3>
        <span className="rounded-full border border-white/10 bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {deals.length}
        </span>
      </div>
      <div className="px-3 py-1.5 text-xs text-muted-foreground">
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
          totalValue
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {deals.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No deals in this stage</p>
        ) : (
          deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        )}
      </div>
    </div>
  );
}
