"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, CHART_LEGEND_STYLE, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";

const PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.primaryContainer,
  CHART_COLORS.secondaryContainer,
  CHART_COLORS.error,
];

export function SourceBreakdown({ data }: { data: { source: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <CardTitle className="text-base">Leads by source</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No lead data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="source" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((entry, i) => (
                  <Cell key={entry.source} fill={PALETTE[i % PALETTE.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Legend {...CHART_LEGEND_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
