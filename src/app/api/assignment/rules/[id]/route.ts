import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { updateRule, deleteRule } from "@/server/services/assignment-rule.service";
import { updateAssignmentRuleSchema } from "@/server/validation/assignment.schema";

export const PATCH = withAuth<{ id: string }>(
  async (req, { organizationId, params }) => {
    try {
      const body = updateAssignmentRuleSchema.parse(await req.json());
      const rule = await updateRule(organizationId, params.id, body);
      return NextResponse.json({ rule });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);

export const DELETE = withAuth<{ id: string }>(
  async (_req, { organizationId, params }) => {
    await deleteRule(organizationId, params.id);
    return NextResponse.json({ success: true });
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
