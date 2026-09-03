import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import {
  getOrCreateSettings,
  updateSettings,
} from "@/server/repositories/assignment-settings.repository";

const updateSettingsSchema = z.object({
  automaticAssignmentEnabled: z.boolean().optional(),
  defaultStrategy: z.enum(["ROUND_ROBIN", "LEAST_ASSIGNED", "WEIGHTED_ROUND_ROBIN", "MANUAL"]).optional(),
  defaultTeamId: z.string().nullable().optional(),
  enforceCapacity: z.boolean().optional(),
  notifyAssignedUser: z.boolean().optional(),
  notifyManagersOnUnassigned: z.boolean().optional(),
  fallbackBehavior: z.enum(["UNASSIGNED_QUEUE", "DEFAULT_TEAM"]).optional(),
  importAssignmentMode: z.enum(["ASSIGN_IMPORTED_LEADS", "DO_NOT_ASSIGN_IMPORTED_LEADS"]).optional(),
});

export const GET = withAuth(async (_req, { organizationId }) => {
  const settings = await getOrCreateSettings(organizationId);
  return NextResponse.json({ settings });
});

export const PATCH = withAuth(
  async (req, { organizationId }) => {
    try {
      const body = updateSettingsSchema.parse(await req.json());

      if (body.defaultTeamId) {
        const { prisma } = await import("@/lib/prisma");
        const team = await prisma.salesTeam.findFirst({
          where: { id: body.defaultTeamId, organizationId, isActive: true },
        });
        if (!team) {
          return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "Default team must be an active team in this organization" } },
            { status: 422 }
          );
        }
      }

      const settings = await updateSettings(organizationId, body);
      return NextResponse.json({ settings });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
