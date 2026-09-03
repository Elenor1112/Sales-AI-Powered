import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { changeStatus } from "@/server/services/lead.service";
import { changeStatusSchema } from "@/server/validation/lead.schema";
import { assertLeadAccess } from "@/server/services/lead-access";

export const POST = withAuth<{ id: string }>(async (req, { organizationId, params, session }) => {
  try {
    await assertLeadAccess(session, params.id);
    const body = changeStatusSchema.parse(await req.json());
    const lead = await changeStatus(organizationId, params.id, session.userId, body);
    return NextResponse.json({ lead });
  } catch (error) {
    return toErrorResponse(error);
  }
});
