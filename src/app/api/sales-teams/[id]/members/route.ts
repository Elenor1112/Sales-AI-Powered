import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { listTeamMembers, addTeamMember } from "@/server/services/sales-team.service";
import { addTeamMemberSchema } from "@/server/validation/sales-team.schema";

export const GET = withAuth<{ id: string }>(async (_req, { organizationId, params }) => {
  const members = await listTeamMembers(organizationId, params.id);
  return NextResponse.json({ members });
});

export const POST = withAuth<{ id: string }>(
  async (req, { organizationId, params }) => {
    try {
      const body = addTeamMemberSchema.parse(await req.json());
      const member = await addTeamMember(organizationId, params.id, body);
      return NextResponse.json({ member }, { status: 201 });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
