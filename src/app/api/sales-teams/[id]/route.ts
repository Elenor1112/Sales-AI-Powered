import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { getTeam, updateTeam, deleteTeam } from "@/server/services/sales-team.service";
import { updateTeamSchema } from "@/server/validation/sales-team.schema";

export const GET = withAuth<{ id: string }>(async (_req, { organizationId, params }) => {
  const team = await getTeam(organizationId, params.id);
  return NextResponse.json({ team });
});

export const PATCH = withAuth<{ id: string }>(
  async (req, { organizationId, params }) => {
    try {
      const body = updateTeamSchema.parse(await req.json());
      const team = await updateTeam(organizationId, params.id, body);
      return NextResponse.json({ team });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);

export const DELETE = withAuth<{ id: string }>(
  async (_req, { organizationId, params }) => {
    await deleteTeam(organizationId, params.id);
    return NextResponse.json({ success: true });
  },
  { roles: [Role.ADMIN] }
);
