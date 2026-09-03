import { Role } from "@prisma/client";
import { ForbiddenError } from "@/lib/errors";
import type { RequestSession } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * SALES_REP may only view/act on leads assigned to them (spec §3: "View
 * leads assigned to them"). ADMIN and SALES_MANAGER are unrestricted within
 * the organization for this pass (team-scoped restriction for managers is a
 * documented simplification — see docs/sales-system.md).
 */
export async function assertLeadAccess(session: RequestSession, leadId: string): Promise<void> {
  if (session.role !== Role.SALES_REP) return;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: session.organizationId },
    select: { assignedUserId: true },
  });
  if (!lead || lead.assignedUserId !== session.userId) {
    throw new ForbiddenError("You do not have access to this lead");
  }
}

export function canReassign(session: RequestSession): boolean {
  return session.role === Role.ADMIN || session.role === Role.SALES_MANAGER;
}
