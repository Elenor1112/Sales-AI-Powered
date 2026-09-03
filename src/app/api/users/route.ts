import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

/**
 * Lists users in the caller's organization. Used by admin/manager-facing
 * pickers (team member add, task assignee, deal owner) that need to select
 * any org user, not just existing sales-team members (which
 * /api/assignment/workload is limited to).
 */
export const GET = withAuth(async (_req, { organizationId }) => {
  const users = await prisma.user.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ users });
});
