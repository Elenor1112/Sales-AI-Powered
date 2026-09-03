import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

describe("Meta webhook idempotency", () => {
  let organizationId: string;
  let fakePageId: string;
  let fakeLeadgenId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: "Webhook Test Org", slug: `webhook-test-${Date.now()}` },
    });
    organizationId = org.id;

    const admin = await prisma.user.create({
      data: { organizationId, name: "Admin", email: `webhook-admin-${Date.now()}@example.com`, role: "ADMIN" },
    });

    const connection = await prisma.metaConnection.create({
      data: {
        organizationId,
        connectedByUserId: admin.id,
        status: "CONNECTED",
        accessTokenEncrypted: encrypt("fake-user-token"),
      },
    });

    fakePageId = `page-${Date.now()}`;
    await prisma.metaPage.create({
      data: {
        organizationId,
        connectionId: connection.id,
        metaPageId: fakePageId,
        name: "Test Page",
        accessTokenEncrypted: encrypt("fake-page-token"),
      },
    });

    fakeLeadgenId = `leadgen-${Date.now()}`;

    const { metaProvider } = await import("@/server/integrations/meta/provider");
    vi.spyOn(metaProvider, "getLeadById").mockResolvedValue({
      id: fakeLeadgenId,
      created_time: new Date().toISOString(),
      form_id: "form-1",
      field_data: [
        { name: "full_name", values: ["Idempotency Test"] },
        { name: "email", values: ["idempotency@example.com"] },
      ],
    });
  }, 30000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.leadActivity.deleteMany({ where: { organizationId } });
    await prisma.lead.deleteMany({ where: { organizationId } });
    await prisma.metaWebhookEvent.deleteMany({ where: { metaPageId: fakePageId } });
    await prisma.metaPage.deleteMany({ where: { organizationId } });
    await prisma.metaConnection.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("processes an identical webhook payload delivered twice as exactly one lead", async () => {
    const { processWebhookPayload } = await import("@/server/integrations/meta/webhooks");

    const payload = {
      object: "page",
      entry: [
        {
          id: fakePageId,
          changes: [
            { field: "leadgen", value: { leadgen_id: fakeLeadgenId, page_id: fakePageId, form_id: "form-1" } },
          ],
        },
      ],
    };

    await processWebhookPayload(payload as never);
    await processWebhookPayload(payload as never); // simulated redelivery

    const leads = await prisma.lead.findMany({ where: { organizationId, metaLeadId: fakeLeadgenId } });
    expect(leads).toHaveLength(1);

    const events = await prisma.metaWebhookEvent.findMany({ where: { metaLeadId: fakeLeadgenId } });
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("PROCESSED");

    const { metaProvider } = await import("@/server/integrations/meta/provider");
    expect(metaProvider.getLeadById).toHaveBeenCalledTimes(1); // second delivery never re-fetched from Graph API
  }, 30000);

  it("ignores non-leadgen webhook fields without error", async () => {
    const { processWebhookPayload } = await import("@/server/integrations/meta/webhooks");
    await expect(
      processWebhookPayload({
        object: "page",
        entry: [{ id: fakePageId, changes: [{ field: "feed", value: {} as never }] }],
      } as never)
    ).resolves.not.toThrow();
  });
});
