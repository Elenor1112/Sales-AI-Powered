import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { getLeadAnalytics, getConversionAnalytics, getRevenueAnalytics } from "@/server/services/analytics.service";

const querySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  metric: z.enum(["leads", "conversion", "revenue"]).default("leads"),
  groupBy: z.enum(["salesperson", "team", "source"]).default("salesperson"),
});

export const GET = withAuth(
  async (req, { organizationId }) => {
    try {
      const url = new URL(req.url);
      const query = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const range = {
        from: query.dateFrom ? new Date(query.dateFrom) : undefined,
        to: query.dateTo ? new Date(query.dateTo) : undefined,
      };

      if (query.metric === "conversion") {
        return NextResponse.json({ conversion: await getConversionAnalytics(organizationId, range, query.groupBy) });
      }
      if (query.metric === "revenue") {
        return NextResponse.json({ revenue: await getRevenueAnalytics(organizationId, range) });
      }
      return NextResponse.json(await getLeadAnalytics(organizationId, range));
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
