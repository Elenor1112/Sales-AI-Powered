import { logger } from "@/lib/logger";
import { graphFetch, MetaApiError } from "./client";
import type { MetaGraphAd, MetaGraphCampaign, MetaPagedResponse } from "./types";

/**
 * Campaign/ad name enrichment requires ads_management/ads_read scopes,
 * which are optional (see permissions.ts). If the connection doesn't have
 * them, these calls fail with a permissions error — callers should treat
 * that as "no enrichment available" rather than a hard failure, per spec
 * §26 ("do not invent Meta metrics the API does not provide").
 */
export async function getCampaigns(adAccountId: string, accessToken: string): Promise<MetaGraphCampaign[]> {
  try {
    const response = await graphFetch<MetaPagedResponse<MetaGraphCampaign>>(`${adAccountId}/campaigns`, {
      access_token: accessToken,
      fields: "id,name",
    });
    return response.data;
  } catch (error) {
    if (error instanceof MetaApiError) {
      logger.info({ adAccountId }, "Campaign enrichment unavailable (missing ads permission or access)");
      return [];
    }
    throw error;
  }
}

export async function getAds(adAccountId: string, accessToken: string): Promise<MetaGraphAd[]> {
  try {
    const response = await graphFetch<MetaPagedResponse<MetaGraphAd>>(`${adAccountId}/ads`, {
      access_token: accessToken,
      fields: "id,name,adset_id",
    });
    return response.data;
  } catch (error) {
    if (error instanceof MetaApiError) {
      logger.info({ adAccountId }, "Ad enrichment unavailable (missing ads permission or access)");
      return [];
    }
    throw error;
  }
}
