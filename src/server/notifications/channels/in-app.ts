import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface InAppNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export function deliverInApp(input: InAppNotificationInput) {
  return prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    },
  });
}
