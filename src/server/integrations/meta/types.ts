export interface MetaGraphPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

export interface MetaGraphForm {
  id: string;
  name: string;
  status?: string;
}

export interface MetaLeadFieldData {
  name: string;
  values: string[];
}

export interface MetaGraphLead {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data: MetaLeadFieldData[];
}

export interface MetaGraphCampaign {
  id: string;
  name: string;
}

export interface MetaGraphAdSet {
  id: string;
  name: string;
  campaign_id?: string;
}

export interface MetaGraphAd {
  id: string;
  name: string;
  adset_id?: string;
}

export interface MetaPagedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
  };
}

export interface MetaOAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface NormalizedMetaLead {
  metaLeadId: string;
  metaPageId: string;
  metaFormId: string | null;
  metaCampaignId: string | null;
  metaAdSetId: string | null;
  metaAdId: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  customFields: Record<string, string | string[]>;
  rawFieldData: MetaLeadFieldData[];
  createdTime: string;
}

/**
 * Abstraction the rest of the app depends on instead of the concrete Graph
 * API client (spec §45). The production implementation (client.ts + the
 * other modules in this folder) is the only implementation used at runtime;
 * a mock implementing this same interface may exist only under test/
 * fixtures.
 */
export interface MetaProvider {
  getPages(accessToken: string): Promise<MetaGraphPage[]>;
  getForms(pageId: string, pageAccessToken: string): Promise<MetaGraphForm[]>;
  getLeads(
    formId: string,
    pageAccessToken: string,
    options?: { after?: string; since?: number }
  ): Promise<MetaPagedResponse<MetaGraphLead>>;
  getLeadById(leadgenId: string, pageAccessToken: string): Promise<MetaGraphLead>;
  getCampaigns(adAccountId: string, accessToken: string): Promise<MetaGraphCampaign[]>;
  getAds(adAccountId: string, accessToken: string): Promise<MetaGraphAd[]>;
}
