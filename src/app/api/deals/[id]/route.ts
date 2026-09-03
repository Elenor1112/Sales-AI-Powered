import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { getDeal, updateDeal } from "@/server/services/deal.service";
import { updateDealSchema } from "@/server/validation/deal.schema";

export const GET = withAuth<{ id: string }>(async (_req, { organizationId, params }) => {
  try {
    const deal = await getDeal(organizationId, params.id);
    return NextResponse.json({ deal });
  } catch (error) {
    return toErrorResponse(error);
  }
});

export const PATCH = withAuth<{ id: string }>(async (req, { organizationId, params, session }) => {
  try {
    const body = updateDealSchema.parse(await req.json());
    const deal = await updateDeal(organizationId, params.id, session.userId, body);
    return NextResponse.json({ deal });
  } catch (error) {
    return toErrorResponse(error);
  }
});
