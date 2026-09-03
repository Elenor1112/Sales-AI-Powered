import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { toPaginatedResult } from "@/lib/pagination";
import { listDeals, createDeal } from "@/server/services/deal.service";
import { createDealSchema, dealQuerySchema } from "@/server/validation/deal.schema";

export const GET = withAuth(async (req, { organizationId }) => {
  try {
    const url = new URL(req.url);
    const query = dealQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const { items, total } = await listDeals(organizationId, query);
    return NextResponse.json(toPaginatedResult(items, total, query));
  } catch (error) {
    return toErrorResponse(error);
  }
});

export const POST = withAuth(async (req, { organizationId, session }) => {
  try {
    const body = createDealSchema.parse(await req.json());
    const deal = await createDeal(organizationId, session.userId, body);
    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
});
