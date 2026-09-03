import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
}) {
  return (
    <Card className={cn("glass-card relative overflow-hidden border-0", className)}>
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 blur-xl" />
      <CardContent className="relative flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums glow-text">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trend.positive ? "text-tertiary" : "text-destructive")}>
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
