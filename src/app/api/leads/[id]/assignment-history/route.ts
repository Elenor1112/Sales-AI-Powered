import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { getAssignmentHistory } from "@/server/services/lead.service";
import { assertLeadAccess } from "@/server/services/lead-access";

export const GET = withAuth<{ id: string }>(async (_req, { organizationId, params, session }) => {
  try {
    await assertLeadAccess(session, params.id);
    const history = await getAssignmentHistory(organizationId, params.id);
    return NextResponse.json({ history });
  } catch (error) {
    return toErrorResponse(error);
  }
});
