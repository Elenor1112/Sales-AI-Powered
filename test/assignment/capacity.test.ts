import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEligibleMembers } from "@/server/assignment/assignment.capacity";
import type { EligibleMember } from "@/server/assignment/assignment.types";

describe("getEligibleMembers", () => {
  let organizationId: string;
  let teamId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const org = await prisma.organization.create({ data: { name: "Capacity Test Org", slug: `capacity-test-${Date.now()}` } });
    organizationId = org.id;

    const team = await prisma.salesTeam.create({ data: { organizationId, name: "Test Team" } });
    teamId = team.id;

    const users = await Promise.all(
      ["Active User", "Paused User", "Inactive Account User", "At Capacity User"].map((name, i) =>
        prisma.user.create({
          data: {
            organizationId,
            name,
            email: `capacity-test-${Date.now()}-${i}@example.com`,
            role: "SALES_REP",
            isActive: name !== "Inactive Account User",
          },
        })
      )
    );
    userIds.push(...users.map((u: User) => u.id));

    await prisma.salesTeamMember.create({
      data: { organizationId, teamId, userId: users[0].id, isActive: true, isPaused: false },
    });
    await prisma.salesTeamMember.create({
      data: { organizationId, teamId, userId: users[1].id, isActive: true, isPaused: true },
    });
    await prisma.salesTeamMember.create({
      data: { organizationId, teamId, userId: users[2].id, isActive: true, isPaused: false },
    });
    await prisma.salesTeamMember.create({
      data: { organizationId, teamId, userId: users[3].id, isActive: true, isPaused: false, maxActiveLeads: 1 },
    });

    // Give the "At Capacity User" one active lead so they're at their limit of 1.
    await prisma.lead.create({
      data: { organizationId, name: "Existing lead", assignedUserId: users[3].id, status: "NEW" },
    });
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { organizationId } });
    await prisma.salesTeamMember.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.salesTeam.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("excludes paused, inactive-account, and at-capacity members, keeping only the active eligible one", async () => {
    const eligible = await prisma.$transaction((tx: Prisma.TransactionClient) =>
      getEligibleMembers(tx, organizationId, teamId, { enforceCapacity: true })
    );
    expect(eligible).toHaveLength(1);
    expect(eligible[0].userId).toBe(userIds[0]);
  });

  it("includes the at-capacity member when capacity enforcement is disabled", async () => {
    const eligible = await prisma.$transaction((tx: Prisma.TransactionClient) =>
      getEligibleMembers(tx, organizationId, teamId, { enforceCapacity: false })
    );
    const eligibleIds = eligible.map((m: EligibleMember) => m.userId);
    expect(eligibleIds).toContain(userIds[0]);
    expect(eligibleIds).toContain(userIds[3]);
    expect(eligibleIds).not.toContain(userIds[1]); // still paused
    expect(eligibleIds).not.toContain(userIds[2]); // still inactive account
  });

  it("returns an empty array when the team has no members", async () => {
    const emptyTeam = await prisma.salesTeam.create({ data: { organizationId, name: "Empty Team" } });
    const eligible = await prisma.$transaction((tx: Prisma.TransactionClient) =>
      getEligibleMembers(tx, organizationId, emptyTeam.id, { enforceCapacity: true })
    );
    expect(eligible).toEqual([]);
    await prisma.salesTeam.delete({ where: { id: emptyTeam.id } });
  });
});
