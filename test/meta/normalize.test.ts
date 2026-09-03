import { describe, it, expect } from "vitest";
import { normalizeMetaLead } from "@/server/integrations/meta/normalize";
import type { MetaGraphLead } from "@/server/integrations/meta/types";

function graphLead(fieldData: { name: string; values: string[] }[]): MetaGraphLead {
  return {
    id: "lead-123",
    created_time: "2026-01-01T00:00:00+0000",
    form_id: "form-456",
    campaign_id: "campaign-789",
    adset_id: "adset-101",
    ad_id: "ad-202",
    field_data: fieldData,
  };
}

describe("normalizeMetaLead", () => {
  it("maps well-known field aliases to canonical fields", () => {
    const raw = graphLead([
      { name: "first_name", values: ["Jordan"] },
      { name: "last_name", values: ["Rivera"] },
      { name: "email", values: ["jordan@example.com"] },
      { name: "phone_number", values: ["+15550001111"] },
      { name: "company_name", values: ["Acme Co"] },
      { name: "job_title", values: ["VP Sales"] },
    ]);

    const normalized = normalizeMetaLead(raw, { pageId: "page-1" });

    expect(normalized.firstName).toBe("Jordan");
    expect(normalized.lastName).toBe("Rivera");
    expect(normalized.email).toBe("jordan@example.com");
    expect(normalized.phone).toBe("+15550001111");
    expect(normalized.company).toBe("Acme Co");
    expect(normalized.jobTitle).toBe("VP Sales");
    expect(normalized.name).toBe("Jordan Rivera");
  });

  it("prefers a full_name field over first/last when present", () => {
    const raw = graphLead([
      { name: "full_name", values: ["Alex Chen"] },
      { name: "first_name", values: ["Alexandra"] },
    ]);
    const normalized = normalizeMetaLead(raw, { pageId: "page-1" });
    expect(normalized.name).toBe("Alex Chen");
  });

  it("falls back to email, then phone, then a placeholder when no name field exists", () => {
    const withEmail = normalizeMetaLead(graphLead([{ name: "email", values: ["a@b.com"] }]), { pageId: "p" });
    expect(withEmail.name).toBe("a@b.com");

    const withPhone = normalizeMetaLead(graphLead([{ name: "phone_number", values: ["12345"] }]), { pageId: "p" });
    expect(withPhone.name).toBe("12345");

    const withNeither = normalizeMetaLead(graphLead([]), { pageId: "p" });
    expect(withNeither.name).toBe("Unnamed Meta Lead");
  });

  it("buckets unrecognized fields into customFields without dropping data", () => {
    const raw = graphLead([
      { name: "email", values: ["a@b.com"] },
      { name: "how_did_you_hear_about_us", values: ["Instagram ad"] },
      { name: "preferred_contact_time", values: ["Morning", "Evening"] },
    ]);
    const normalized = normalizeMetaLead(raw, { pageId: "page-1" });

    expect(normalized.customFields).toEqual({
      how_did_you_hear_about_us: "Instagram ad",
      preferred_contact_time: ["Morning", "Evening"],
    });
  });

  it("preserves attribution fields from the raw lead and page/form context", () => {
    const raw = graphLead([{ name: "email", values: ["a@b.com"] }]);
    const normalized = normalizeMetaLead(raw, { pageId: "page-1", formId: "explicit-form-id" });

    expect(normalized.metaLeadId).toBe("lead-123");
    expect(normalized.metaPageId).toBe("page-1");
    expect(normalized.metaFormId).toBe("explicit-form-id");
    expect(normalized.metaCampaignId).toBe("campaign-789");
    expect(normalized.metaAdSetId).toBe("adset-101");
    expect(normalized.metaAdId).toBe("ad-202");
  });

  it("falls back to the raw lead's form_id when no explicit formId is passed", () => {
    const raw = graphLead([]);
    const normalized = normalizeMetaLead(raw, { pageId: "page-1" });
    expect(normalized.metaFormId).toBe("form-456");
  });
});
