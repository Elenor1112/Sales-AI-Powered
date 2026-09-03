import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { getActivities } from "@/server/services/lead.service";
import { assertLeadAccess } from "@/server/services/lead-access";

export const GET = withAuth<{ id: string }>(async (_req, { organizationId, params, session }) => {
  try {
    await assertLeadAccess(session, params.id);
    const activities = await getActivities(organizationId, params.id);
    return NextResponse.json({ activities });
  } catch (error) {
    return toErrorResponse(error);
  }
});
