"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, CHART_LEGEND_STYLE, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";

const COLORS = { won: CHART_COLORS.tertiary, lost: CHART_COLORS.error };

export function WinLossChart({ won, lost }: { won: number; lost: number }) {
  const data = [
    { name: "Won", value: won, color: COLORS.won },
    { name: "Lost", value: lost, color: COLORS.lost },
  ];
  const total = won + lost;

  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <CardTitle className="text-base">Win / Loss</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No won or lost leads in this period
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
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
