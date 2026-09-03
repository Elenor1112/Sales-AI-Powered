import { graphFetch } from "./client";
import type { MetaGraphLead, MetaPagedResponse } from "./types";

const LEAD_FIELDS =
  "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data";

export async function getLeadById(leadgenId: string, pageAccessToken: string): Promise<MetaGraphLead> {
  return graphFetch<MetaGraphLead>(leadgenId, {
    access_token: pageAccessToken,
    fields: LEAD_FIELDS,
  });
}

export async function getLeadsForForm(
  formId: string,
  pageAccessToken: string,
  options: { after?: string; since?: number } = {}
): Promise<MetaPagedResponse<MetaGraphLead>> {
  return graphFetch<MetaPagedResponse<MetaGraphLead>>(`${formId}/leads`, {
    access_token: pageAccessToken,
    fields: LEAD_FIELDS,
    after: options.after,
    since: options.since ? String(options.since) : undefined,
  });
}
