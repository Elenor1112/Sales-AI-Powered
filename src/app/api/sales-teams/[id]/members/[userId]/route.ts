import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { updateTeamMember, removeTeamMember } from "@/server/services/sales-team.service";
import { updateTeamMemberSchema } from "@/server/validation/sales-team.schema";

export const PATCH = withAuth<{ id: string; userId: string }>(
  async (req, { organizationId, params }) => {
    try {
      const body = updateTeamMemberSchema.parse(await req.json());
      const member = await updateTeamMember(organizationId, params.id, params.userId, body);
      return NextResponse.json({ member });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);

export const DELETE = withAuth<{ id: string; userId: string }>(
  async (_req, { organizationId, params }) => {
    await removeTeamMember(organizationId, params.id, params.userId);
    return NextResponse.json({ success: true });
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
