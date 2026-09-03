import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-tertiary/15 text-tertiary border border-tertiary/20",
  ASSIGNED: "bg-primary/15 text-primary border border-primary/20",
  CONTACTED: "bg-secondary/15 text-secondary border border-secondary/20",
  QUALIFIED: "bg-chart-4/15 text-chart-4 border border-chart-4/20",
  PROPOSAL: "bg-chart-5/15 text-chart-5 border border-chart-5/20",
  WON: "bg-tertiary/15 text-tertiary border border-tertiary/20",
  LOST: "bg-destructive/15 text-destructive border border-destructive/20",
};

export function LeadStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_STYLES[status], className)}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
