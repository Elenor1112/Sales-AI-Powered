import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { getAssignmentAnalytics } from "@/server/services/analytics.service";

const querySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
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
      return NextResponse.json(await getAssignmentAnalytics(organizationId, range));
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
