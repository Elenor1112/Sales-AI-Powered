"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { subDays, formatISO } from "date-fns";
import { ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnalyticsCharts } from "@/components/sales/AnalyticsCharts";

const PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const canView = session?.user?.role === "ADMIN" || session?.user?.role === "SALES_MANAGER";

  const [preset, setPreset] = useState("30");

  const { dateFrom, dateTo } = useMemo(() => {
    if (preset === "all") return { dateFrom: undefined, dateTo: undefined };
    const days = Number(preset);
    return {
      dateFrom: formatISO(subDays(new Date(), days)),
      dateTo: formatISO(new Date()),
    };
  }, [preset]);

  if (!canView) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance across your leads, deals, and assignments.</p>
        </div>
        <Card className="glass-panel border-0">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldAlert className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Manager access required</p>
            <p className="text-sm text-muted-foreground">Analytics are only available to admins and sales managers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance across your leads, deals, and assignments.</p>
        </div>
        <Select value={preset} onValueChange={(v) => v && setPreset(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnalyticsCharts dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  );
}
