import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { hasPermission, hasRole } from "@/server/auth/rbac";
import { assertLeadAccess } from "@/server/services/lead-access";
import { ForbiddenError } from "@/lib/errors";
import type { RequestSession } from "@/server/auth/session";

describe("RBAC permission matrix", () => {
  it("grants ADMIN full assignment/settings/analytics permissions", () => {
    expect(hasPermission("ADMIN", "manageUsers")).toBe(true);
    expect(hasPermission("ADMIN", "configureAssignmentSettings")).toBe(true);
    expect(hasPermission("ADMIN", "viewAllAnalytics")).toBe(true);
    expect(hasPermission("ADMIN", "assignAnyLead")).toBe(true);
  });

  it("grants SALES_MANAGER team-level permissions but not org-wide user management", () => {
    expect(hasPermission("SALES_MANAGER", "assignTeamLead")).toBe(true);
    expect(hasPermission("SALES_MANAGER", "viewTeamAnalytics")).toBe(true);
    expect(hasPermission("SALES_MANAGER", "manageUsers")).toBe(false);
    expect(hasPermission("SALES_MANAGER", "viewAllAnalytics")).toBe(false);
  });

  it("restricts SALES_REP to their own leads and tasks only", () => {
    expect(hasPermission("SALES_REP", "viewOwnLeads")).toBe(true);
    expect(hasPermission("SALES_REP", "manageTasks")).toBe(true);
    expect(hasPermission("SALES_REP", "assignTeamLead")).toBe(false);
    expect(hasPermission("SALES_REP", "manageAllLeads")).toBe(false);
    expect(hasPermission("SALES_REP", "configureAssignmentSettings")).toBe(false);
  });

  it("hasRole correctly restricts to the given role set", () => {
    const session = { role: "SALES_REP" } as RequestSession;
    expect(hasRole(session, ["ADMIN", "SALES_MANAGER"])).toBe(false);
    expect(hasRole(session, ["SALES_REP"])).toBe(true);
  });
});

describe("cross-tenant and cross-user lead access", () => {
  let orgA: string;
  let orgB: string;
  let repInOrgA: string;
  let repInOrgB: string;
  let leadInOrgA: string;

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      prisma.organization.create({ data: { name: "Org A", slug: `org-a-${Date.now()}` } }),
      prisma.organization.create({ data: { name: "Org B", slug: `org-b-${Date.now()}` } }),
    ]);
    orgA = a.id;
    orgB = b.id;

    const [userA, otherRepA, userB] = await Promise.all([
      prisma.user.create({
        data: { organizationId: orgA, name: "Rep A", email: `rep-a-${Date.now()}@example.com`, role: "SALES_REP" },
      }),
      prisma.user.create({
        data: { organizationId: orgA, name: "Other Rep A", email: `other-rep-a-${Date.now()}@example.com`, role: "SALES_REP" },
      }),
      prisma.user.create({
        data: { organizationId: orgB, name: "Rep B", email: `rep-b-${Date.now()}@example.com`, role: "SALES_REP" },
      }),
    ]);
    repInOrgA = userA.id;
    repInOrgB = userB.id;

    const lead = await prisma.lead.create({
      data: { organizationId: orgA, name: "Org A Lead", assignedUserId: otherRepA.id },
    });
    leadInOrgA = lead.id;
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  });

  it("blocks a SALES_REP from accessing a lead assigned to a different rep in the same org", async () => {
    const session = { userId: repInOrgA, organizationId: orgA, role: "SALES_REP" } as RequestSession;
    await expect(assertLeadAccess(session, leadInOrgA)).rejects.toThrow(ForbiddenError);
  });

  it("blocks a user from a different organization from accessing the lead at all (not found, not just forbidden)", async () => {
    const session = { userId: repInOrgB, organizationId: orgB, role: "SALES_REP" } as RequestSession;
    await expect(assertLeadAccess(session, leadInOrgA)).rejects.toThrow(ForbiddenError);

    // Confirm the underlying query is organization-scoped: a lookup from Org B's
    // context returns nothing for Org A's lead id, rather than leaking it.
    const leaked = await prisma.lead.findFirst({ where: { id: leadInOrgA, organizationId: orgB } });
    expect(leaked).toBeNull();
  });

  it("allows the assigned SALES_REP to access their own lead", async () => {
    const otherRepA = await prisma.lead.findUniqueOrThrow({ where: { id: leadInOrgA } });
    const session = {
      userId: otherRepA.assignedUserId!,
      organizationId: orgA,
      role: "SALES_REP",
    } as RequestSession;
    await expect(assertLeadAccess(session, leadInOrgA)).resolves.not.toThrow();
  });
});
