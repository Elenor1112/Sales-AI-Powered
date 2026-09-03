import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { getLead, updateLead, deleteLead } from "@/server/services/lead.service";
import { updateLeadSchema } from "@/server/validation/lead.schema";
import { assertLeadAccess } from "@/server/services/lead-access";
import { Role } from "@prisma/client";

export const GET = withAuth<{ id: string }>(async (_req, { organizationId, params, session }) => {
  try {
    await assertLeadAccess(session, params.id);
    const lead = await getLead(organizationId, params.id);
    return NextResponse.json({ lead });
  } catch (error) {
    return toErrorResponse(error);
  }
});

export const PATCH = withAuth<{ id: string }>(async (req, { organizationId, params, session }) => {
  try {
    await assertLeadAccess(session, params.id);
    const body = updateLeadSchema.parse(await req.json());
    const lead = await updateLead(organizationId, params.id, body);
    return NextResponse.json({ lead });
  } catch (error) {
    return toErrorResponse(error);
  }
});

export const DELETE = withAuth<{ id: string }>(
  async (_req, { organizationId, params }) => {
    await deleteLead(organizationId, params.id);
    return NextResponse.json({ success: true });
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
