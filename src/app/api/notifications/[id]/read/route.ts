import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const POST = withAuth<{ id: string }>(async (_req, { session, params }) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: params.id, userId: session.userId, organizationId: session.organizationId },
    });
    if (!notification) throw new NotFoundError("Notification not found");

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { readAt: notification.readAt ?? new Date() },
    });

    return NextResponse.json({ notification: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
});
