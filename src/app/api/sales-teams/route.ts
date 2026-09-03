import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { listTeams, createTeam } from "@/server/services/sales-team.service";
import { createTeamSchema } from "@/server/validation/sales-team.schema";

export const GET = withAuth(async (_req, { organizationId }) => {
  const teams = await listTeams(organizationId);
  return NextResponse.json({ teams });
});

export const POST = withAuth(
  async (req, { organizationId }) => {
    try {
      const body = createTeamSchema.parse(await req.json());
      const team = await createTeam(organizationId, body);
      return NextResponse.json({ team }, { status: 201 });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
