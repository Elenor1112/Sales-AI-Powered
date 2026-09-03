import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { toPaginatedResult } from "@/lib/pagination";
import { listLeads, createLead } from "@/server/services/lead.service";
import { createLeadSchema, leadQuerySchema } from "@/server/validation/lead.schema";
import { Role } from "@prisma/client";

export const GET = withAuth(async (req, { organizationId, session }) => {
  try {
    const url = new URL(req.url);
    const rawQuery = Object.fromEntries(url.searchParams.entries());
    const query = leadQuerySchema.parse(rawQuery);

    // SALES_REP may only see their own leads (spec §3).
    if (session.role === Role.SALES_REP) {
      query.assignedUserId = session.userId;
    }

    const { items, total } = await listLeads(organizationId, query);
    return NextResponse.json(toPaginatedResult(items, total, query));
  } catch (error) {
    return toErrorResponse(error);
  }
});

export const POST = withAuth(async (req, { organizationId, session }) => {
  try {
    const body = createLeadSchema.parse(await req.json());
    const lead = await createLead(organizationId, session.userId, body);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
});
