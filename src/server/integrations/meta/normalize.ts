import type { MetaGraphLead, NormalizedMetaLead } from "./types";

const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ["first_name", "firstname", "given_name"],
  lastName: ["last_name", "lastname", "family_name", "surname"],
  fullName: ["full_name", "name"],
  email: ["email", "work_email"],
  phone: ["phone_number", "phone", "mobile_number"],
  company: ["company_name", "company"],
  jobTitle: ["job_title", "title"],
};

function findFieldValue(
  fieldData: MetaGraphLead["field_data"],
  aliases: string[]
): string | undefined {
  for (const field of fieldData) {
    const key = field.name.toLowerCase().trim();
    if (aliases.includes(key)) {
      return field.values?.[0];
    }
  }
  return undefined;
}

function allKnownKeys(): Set<string> {
  return new Set(Object.values(FIELD_ALIASES).flat());
}

/**
 * Maps a raw Meta lead into the app's canonical shape. Meta form field names
 * vary by form configuration, so this uses fuzzy alias matching for the
 * well-known fields (spec §17) and buckets everything else into
 * customFields so no data is silently dropped.
 */
export function normalizeMetaLead(
  raw: MetaGraphLead,
  attribution: { pageId: string; formId?: string | null }
): NormalizedMetaLead {
  const firstName = findFieldValue(raw.field_data, FIELD_ALIASES.firstName) ?? null;
  const lastName = findFieldValue(raw.field_data, FIELD_ALIASES.lastName) ?? null;
  const fullNameField = findFieldValue(raw.field_data, FIELD_ALIASES.fullName);
  const email = findFieldValue(raw.field_data, FIELD_ALIASES.email) ?? null;
  const phone = findFieldValue(raw.field_data, FIELD_ALIASES.phone) ?? null;
  const company = findFieldValue(raw.field_data, FIELD_ALIASES.company) ?? null;
  const jobTitle = findFieldValue(raw.field_data, FIELD_ALIASES.jobTitle) ?? null;

  const derivedName =
    fullNameField ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    email ||
    phone ||
    "Unnamed Meta Lead";

  const known = allKnownKeys();
  const customFields: Record<string, string | string[]> = {};
  for (const field of raw.field_data) {
    const key = field.name.toLowerCase().trim();
    if (!known.has(key)) {
      customFields[field.name] = field.values.length === 1 ? field.values[0] : field.values;
    }
  }

  return {
    metaLeadId: raw.id,
    metaPageId: attribution.pageId,
    metaFormId: attribution.formId ?? raw.form_id ?? null,
    metaCampaignId: raw.campaign_id ?? null,
    metaAdSetId: raw.adset_id ?? null,
    metaAdId: raw.ad_id ?? null,
    firstName,
    lastName,
    name: derivedName,
    email,
    phone,
    company,
    jobTitle,
    customFields,
    rawFieldData: raw.field_data,
    createdTime: raw.created_time,
  };
}
