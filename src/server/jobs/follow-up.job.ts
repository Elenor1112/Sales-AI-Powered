import { prisma } from "@/lib/prisma";

const DEFAULT_FOLLOWUP_MINUTES = Number(process.env.DEFAULT_FOLLOWUP_MINUTES ?? 15);

/**
 * Creates a default "Contact new lead" follow-up task when a lead is
 * successfully assigned, per spec §24. This is a documented simplification:
 * rather than expanding AssignmentSettings with a dedicated toggle, the
 * behavior is controlled by DEFAULT_FOLLOWUP_MINUTES (set to 0 to disable).
 * Runs outside the assignment transaction — a failure here must never affect
 * the assignment itself.
 */
export async function maybeCreateFollowUpTask(params: {
  organizationId: string;
  leadId: string;
  assignedUserId: string;
}): Promise<{ dueDate: Date } | null> {
  if (!DEFAULT_FOLLOWUP_MINUTES || DEFAULT_FOLLOWUP_MINUTES <= 0) return null;

  const lead = await prisma.lead.findUnique({ where: { id: params.leadId }, select: { name: true } });
  if (!lead) return null;

  const dueDate = new Date(Date.now() + DEFAULT_FOLLOWUP_MINUTES * 60 * 1000);

  await prisma.task.create({
    data: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      assignedUserId: params.assignedUserId,
      createdByUserId: params.assignedUserId,
      title: `Contact new lead: ${lead.name}`,
      dueDate,
      status: "PENDING",
      priority: "HIGH",
    },
  });

  await prisma.leadActivity.create({
    data: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      activityType: "TASK_CREATED",
      metadata: { title: `Contact new lead: ${lead.name}`, dueDate: dueDate.toISOString() },
    },
  });

  return { dueDate };
}
