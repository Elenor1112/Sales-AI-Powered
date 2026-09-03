import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createLeadFromMeta } from "@/server/services/lead.service";
import type { NormalizedMetaLead } from "@/server/integrations/meta/types";

function fakeNormalizedLead(overrides: Partial<NormalizedMetaLead> = {}): NormalizedMetaLead {
  return {
    metaLeadId: "dup-test-lead-1",
    metaPageId: "page-1",
    metaFormId: "form-1",
    metaCampaignId: null,
    metaAdSetId: null,
    metaAdId: null,
    firstName: "Dup",
    lastName: "Test",
    name: "Dup Test",
    email: "dup@example.com",
    phone: null,
    company: null,
    jobTitle: null,
    customFields: {},
    rawFieldData: [],
    createdTime: new Date().toISOString(),
    ...overrides,
  };
}

describe("createLeadFromMeta duplicate prevention", () => {
  let organizationId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: "Duplicate Test Org", slug: `dup-test-${Date.now()}` },
    });
    organizationId = org.id;
    // No assignment settings/team configured — assignment will simply fail
    // safely to UNASSIGNED, which is fine; this test is about dedup, not assignment.
  });

  afterAll(async () => {
    await prisma.leadActivity.deleteMany({ where: { organizationId } });
    await prisma.lead.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("creates exactly one lead when the same metaLeadId is submitted twice", async () => {
    const normalized = fakeNormalizedLead({ metaLeadId: `dup-${Date.now()}` });

    const first = await createLeadFromMeta(organizationId, normalized, { skipAssignment: true });
    expect(first.wasCreated).toBe(true);

    const second = await createLeadFromMeta(organizationId, normalized, { skipAssignment: true });
    expect(second.wasCreated).toBe(false);
    expect(second.lead.id).toBe(first.lead.id);

    const leads = await prisma.lead.findMany({ where: { organizationId, metaLeadId: normalized.metaLeadId } });
    expect(leads).toHaveLength(1);
  });

  it("allows two different leads with different metaLeadIds even with the same email", async () => {
    const leadA = fakeNormalizedLead({ metaLeadId: `dup-a-${Date.now()}`, email: "shared@example.com" });
    const leadB = fakeNormalizedLead({ metaLeadId: `dup-b-${Date.now()}`, email: "shared@example.com" });

    const resultA = await createLeadFromMeta(organizationId, leadA, { skipAssignment: true });
    const resultB = await createLeadFromMeta(organizationId, leadB, { skipAssignment: true });

    expect(resultA.wasCreated).toBe(true);
    expect(resultB.wasCreated).toBe(true);
    expect(resultA.lead.id).not.toBe(resultB.lead.id);
  });

  it("does not treat two different organizations' identical metaLeadId as a collision", async () => {
    const otherOrg = await prisma.organization.create({
      data: { name: "Other Org", slug: `dup-other-${Date.now()}` },
    });

    const sharedMetaLeadId = `cross-org-${Date.now()}`;
    const resultInOrgA = await createLeadFromMeta(
      organizationId,
      fakeNormalizedLead({ metaLeadId: sharedMetaLeadId }),
      { skipAssignment: true }
    );
    const resultInOrgB = await createLeadFromMeta(
      otherOrg.id,
      fakeNormalizedLead({ metaLeadId: sharedMetaLeadId }),
      { skipAssignment: true }
    );

    expect(resultInOrgA.wasCreated).toBe(true);
    expect(resultInOrgB.wasCreated).toBe(true);

    await prisma.lead.deleteMany({ where: { organizationId: otherOrg.id } });
    await prisma.organization.delete({ where: { id: otherOrg.id } });
  });
});
