import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { assignLead } from "@/server/assignment/assignment.service";

export const POST = withAuth<{ leadId: string }>(
  async (_req, { organizationId, params, session }) => {
    try {
      const result = await assignLead({
        leadId: params.leadId,
        organizationId,
        trigger: "RETRY",
        triggeredByUserId: session.userId,
      });
      return NextResponse.json({ result });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
