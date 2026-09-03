import { PipelineColumn } from "./PipelineColumn";
import type { DealWithRelations } from "@/lib/api/deals";

const STAGES = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export function PipelineBoard({ deals }: { deals: DealWithRelations[] }) {
  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No deals yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Create a deal to start tracking your pipeline.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {STAGES.map((stage) => (
        <PipelineColumn key={stage} stage={stage} deals={deals.filter((d) => d.stage === stage)} />
      ))}
    </div>
  );
}
