import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { reassignLeadSchema } from "@/server/validation/assignment.schema";
import { assignLead } from "@/server/assignment/assignment.service";

export const POST = withAuth<{ id: string }>(
  async (req, { organizationId, params, session }) => {
    try {
      const body = reassignLeadSchema.parse(await req.json());

      const result = await assignLead({
        leadId: params.id,
        organizationId,
        trigger: "MANUAL",
        targetUserId: body.userId,
        targetTeamId: body.teamId,
        triggeredByUserId: session.userId,
        reason: body.reason,
      });

      return NextResponse.json({ result });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
