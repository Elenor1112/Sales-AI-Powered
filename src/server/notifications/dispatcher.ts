import type { NotificationType, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { deliverInApp } from "./channels/in-app";

export interface NotifyInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Delivers a notification through every registered channel. In-app (a DB
 * row surfaced via GET /api/notifications) is the only channel implemented
 * in this pass; future channels (email, Slack, SMS) register here without
 * changing call sites — see docs/sales-system.md.
 *
 * Failures are logged, never thrown: a notification failure must never roll
 * back or block the assignment/lead operation that triggered it.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await deliverInApp(input);
  } catch (error) {
    logger.error({ err: error, organizationId: input.organizationId, userId: input.userId }, "Failed to deliver notification");
  }
}

export async function notifyRoles(
  organizationId: string,
  roles: Role[],
  data: Omit<NotifyInput, "organizationId" | "userId">
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId, role: { in: roles }, isActive: true },
      select: { id: true },
    });
    await Promise.all(users.map((u) => notify({ ...data, organizationId, userId: u.id })));
  } catch (error) {
    logger.error({ err: error, organizationId }, "Failed to notify roles");
  }
}
