import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function CapacityIndicator({
  active,
  max,
  className,
}: {
  active: number;
  max: number | null;
  className?: string;
}) {
  if (max === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>{active} active (no limit)</span>;
  }

  const pct = Math.min(100, Math.round((active / max) * 100));
  const isFull = active >= max;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress
        value={pct}
        className={cn("w-24", isFull && "[&_[data-slot=progress-indicator]]:bg-destructive")}
      />
      <span className={cn("text-xs tabular-nums", isFull ? "font-medium text-destructive" : "text-muted-foreground")}>
        {active}/{max}
      </span>
    </div>
  );
}
