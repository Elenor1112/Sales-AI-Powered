import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { listRules, createRule } from "@/server/services/assignment-rule.service";
import { createAssignmentRuleSchema } from "@/server/validation/assignment.schema";

export const GET = withAuth(async (_req, { organizationId }) => {
  const rules = await listRules(organizationId);
  return NextResponse.json({ rules });
});

export const POST = withAuth(
  async (req, { organizationId }) => {
    try {
      const body = createAssignmentRuleSchema.parse(await req.json());
      const rule = await createRule(organizationId, body);
      return NextResponse.json({ rule }, { status: 201 });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
