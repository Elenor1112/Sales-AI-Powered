import { Role } from "@prisma/client";
import { notify, notifyRoles } from "@/server/notifications/dispatcher";
import { prisma } from "@/lib/prisma";

export async function notifyLeadAssigned(params: {
  organizationId: string;
  leadId: string;
  assignedUserId: string;
  isManual: boolean;
  followUpDueAt?: Date | null;
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.leadId },
    select: { name: true, source: true, assignedTeam: { select: { name: true } } },
  });
  if (!lead) return;

  await notify({
    organizationId: params.organizationId,
    userId: params.assignedUserId,
    type: params.isManual ? "LEAD_MANUAL_ASSIGNED" : "LEAD_AUTO_ASSIGNED",
    title: "New lead assigned to you",
    message: `${lead.name} (${lead.source}) has been assigned to you.`,
    metadata: {
      leadId: params.leadId,
      leadName: lead.name,
      source: lead.source,
      team: lead.assignedTeam?.name ?? null,
      followUpDueAt: params.followUpDueAt?.toISOString() ?? null,
    },
  });
}

export async function notifyLeadReassigned(params: {
  organizationId: string;
  leadId: string;
  newUserId: string;
  previousUserId?: string | null;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId }, select: { name: true } });
  if (!lead) return;

  await notify({
    organizationId: params.organizationId,
    userId: params.newUserId,
    type: "LEAD_REASSIGNED",
    title: "Lead reassigned to you",
    message: `${lead.name} has been reassigned to you.`,
    metadata: { leadId: params.leadId },
  });

  if (params.previousUserId) {
    await notify({
      organizationId: params.organizationId,
      userId: params.previousUserId,
      type: "LEAD_REASSIGNED",
      title: "Lead reassigned",
      message: `${lead.name} has been reassigned to another salesperson.`,
      metadata: { leadId: params.leadId },
    });
  }
}

export async function notifyAssignmentFailed(params: {
  organizationId: string;
  leadId: string;
  reason: string;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId }, select: { name: true } });
  await notifyRoles(params.organizationId, [Role.ADMIN, Role.SALES_MANAGER], {
    type: "NO_ELIGIBLE_SALESPERSON",
    title: "Lead could not be assigned",
    message: `${lead?.name ?? "A lead"} could not be automatically assigned: ${params.reason}`,
    metadata: { leadId: params.leadId, reason: params.reason },
  });
}
