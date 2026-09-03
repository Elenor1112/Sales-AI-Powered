"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_TICK, CHART_COLORS, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";

const PRIMARY = CHART_COLORS.primary;

export interface RevenueBySalesperson {
  userId: string | null;
  label: string;
  revenue: number;
}

export function RevenueChart({ data }: { data: RevenueBySalesperson[] }) {
  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <CardTitle className="text-base">Revenue by salesperson</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No won deals in this period
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="label" tick={CHART_AXIS_TICK} />
              <YAxis tick={CHART_AXIS_TICK} />
              <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} {...CHART_TOOLTIP_STYLE} />
              <Bar dataKey="revenue" fill={PRIMARY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
