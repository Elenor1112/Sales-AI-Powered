"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssignmentAnalytics as AssignmentAnalyticsData } from "@/lib/api/analytics";
import { CHART_AXIS_TICK, CHART_COLORS, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";

const PRIMARY = CHART_COLORS.primary;

export function AssignmentAnalytics({ data }: { data: AssignmentAnalyticsData }) {
  const strategyData = data.assignedByStrategy.map((s) => ({ method: s.method.replaceAll("_", " "), count: s.count }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="glass-panel border-0">
        <CardHeader>
          <CardTitle className="text-base">Assigned by strategy</CardTitle>
        </CardHeader>
        <CardContent>
          {strategyData.length === 0 ? (
            <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No assignments in this period
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={strategyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="method" tick={{ ...CHART_AXIS_TICK, fontSize: 11 }} />
                <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-0">
        <CardHeader>
          <CardTitle className="text-base">Assigned per salesperson</CardTitle>
        </CardHeader>
        <CardContent>
          {data.assignedPerSalesperson.length === 0 ? (
            <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No assignments in this period
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assignedPerSalesperson.map((row) => (
                    <TableRow key={row.userId ?? "unknown"} className="border-white/5">
                      <TableCell className="text-sm">{row.name ?? "Unknown"}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-0 lg:col-span-2">
        <CardContent className="flex flex-wrap gap-6 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Unassigned leads</p>
            <p className="text-2xl font-bold tabular-nums">{data.unassignedLeadCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reassignments</p>
            <p className="text-2xl font-bold tabular-nums">{data.reassignmentCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
