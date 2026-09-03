import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse, ValidationError } from "@/lib/errors";
import { assignLeadSchema } from "@/server/validation/assignment.schema";
import { assignLead } from "@/server/assignment/assignment.service";
import { prisma } from "@/lib/prisma";

export const POST = withAuth<{ id: string }>(
  async (req, { organizationId, params, session }) => {
    try {
      const body = assignLeadSchema.parse(await req.json());

      const lead = await prisma.lead.findFirst({ where: { id: params.id, organizationId } });
      if (!lead) {
        throw new ValidationError("Lead not found");
      }
      if (lead.assignedUserId) {
        throw new ValidationError("Lead is already assigned. Use the reassign endpoint instead.");
      }

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
