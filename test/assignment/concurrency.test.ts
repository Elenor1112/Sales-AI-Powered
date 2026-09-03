import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Lead, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assignLead } from "@/server/assignment/assignment.service";
import type { AssignLeadResult } from "@/server/assignment/assignment.types";

describe("assignment concurrency safety", () => {
  let organizationId: string;
  let teamId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: "Concurrency Test Org", slug: `concurrency-test-${Date.now()}` },
    });
    organizationId = org.id;

    const team = await prisma.salesTeam.create({ data: { organizationId, name: "Concurrency Team" } });
    teamId = team.id;

    const users = await Promise.all(
      ["Rep One", "Rep Two", "Rep Three"].map((name, i) =>
        prisma.user.create({
          data: { organizationId, name, email: `concurrency-${Date.now()}-${i}@example.com`, role: "SALES_REP" },
        })
      )
    );
    userIds.push(...users.map((u: User) => u.id));

    for (const user of users) {
      await prisma.salesTeamMember.create({ data: { organizationId, teamId, userId: user.id } });
    }

    await prisma.assignmentSettings.create({
      data: { organizationId, automaticAssignmentEnabled: true, defaultTeamId: teamId, defaultStrategy: "ROUND_ROBIN" },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.assignmentHistory.deleteMany({ where: { organizationId } });
    await prisma.leadAssignment.deleteMany({ where: { organizationId } });
    await prisma.leadActivity.deleteMany({ where: { organizationId } });
    await prisma.lead.deleteMany({ where: { organizationId } });
    await prisma.assignmentState.deleteMany({ where: { organizationId } });
    await prisma.assignmentSettings.deleteMany({ where: { organizationId } });
    await prisma.salesTeamMember.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.salesTeam.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("never assigns the same lead twice when AUTO is called concurrently on it", async () => {
    const lead = await prisma.lead.create({ data: { organizationId, name: "Racing Lead", assignedTeamId: teamId } });

    const results = await Promise.all(
      Array.from({ length: 5 }, () => assignLead({ leadId: lead.id, organizationId, trigger: "AUTO" }))
    );

    const assignedResults = results.filter((r) => r.status === "ASSIGNED");
    const alreadyAssignedResults = results.filter((r) => r.status === "ALREADY_ASSIGNED");

    // Exactly one call should have performed the actual assignment; the rest
    // must observe it as already assigned rather than re-assigning.
    expect(assignedResults).toHaveLength(1);
    expect(alreadyAssignedResults).toHaveLength(4);

    const assignmentRecords = await prisma.leadAssignment.findMany({ where: { leadId: lead.id } });
    expect(assignmentRecords).toHaveLength(1);
  }, 30000);

  it("assigns every lead exactly once and advances the round-robin pointer correctly under concurrent load", async () => {
    await prisma.assignmentState.deleteMany({ where: { organizationId, teamId } });

    const leadCount = 9; // 3 full round-robin cycles across 3 reps
    const leads = await Promise.all(
      Array.from({ length: leadCount }, (_, i) =>
        prisma.lead.create({ data: { organizationId, name: `Load Lead ${i}`, assignedTeamId: teamId } })
      )
    );

    const results = await Promise.all(
      leads.map((lead: Lead) => assignLead({ leadId: lead.id, organizationId, trigger: "AUTO" }))
    );

    expect(results.every((r: AssignLeadResult) => r.status === "ASSIGNED")).toBe(true);

    const counts: Record<string, number> = {};
    for (const result of results) {
      const uid = result.assignedUserId!;
      counts[uid] = (counts[uid] ?? 0) + 1;
    }

    // With 9 leads across 3 equally-weighted reps, round robin should land
    // on exactly 3 each regardless of arrival order, since every assignment
    // decision is serialized through the locked AssignmentState row.
    expect(Object.values(counts).sort()).toEqual([3, 3, 3]);

    const thisTestLeadIds = leads.map((l) => l.id);
    const assignmentRecords = await prisma.leadAssignment.findMany({
      where: { organizationId, leadId: { in: thisTestLeadIds } },
    });
    const distinctLeadIds = new Set(assignmentRecords.map((r: { leadId: string }) => r.leadId));
    expect(assignmentRecords).toHaveLength(leadCount); // exactly one assignment record per lead, no duplicates
    expect(distinctLeadIds.size).toBe(leadCount);
  }, 30000);
});
