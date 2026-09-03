import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (_req, { session }) => {
  const result = await prisma.notification.updateMany({
    where: { userId: session.userId, organizationId: session.organizationId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ updatedCount: result.count });
});
