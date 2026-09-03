import { prisma } from "@/lib/prisma";
import { resolveAssignmentRule } from "@/server/assignment/assignment.rules";

export async function listUnassignedLeads(organizationId: string) {
  const leads = await prisma.lead.findMany({
    where: { organizationId, assignmentStatus: { in: ["UNASSIGNED", "REASSIGNMENT_REQUIRED"] } },
    orderBy: { createdAt: "asc" },
    include: {
      activities: {
        where: { activityType: "ASSIGNMENT_FAILED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const results = await Promise.all(
    leads.map(async (lead) => {
      const routing = await resolveAssignmentRule(prisma, organizationId, {
        source: lead.source,
        metaPageId: lead.metaPageId,
        metaFormId: lead.metaFormId,
        metaCampaignId: lead.metaCampaignId,
        metaAdSetId: lead.metaAdSetId,
        metaAdId: lead.metaAdId,
      });

      return {
        id: lead.id,
        name: lead.name,
        source: lead.source,
        createdAt: lead.createdAt,
        waitingMs: Date.now() - lead.createdAt.getTime(),
        assignmentStatus: lead.assignmentStatus,
        failureReason:
          (lead.activities[0]?.metadata as { reason?: string } | null)?.reason ?? null,
        matchingTeamId: routing?.teamId ?? null,
        matchingRuleId: routing?.ruleId ?? null,
      };
    })
  );

  return results;
}
