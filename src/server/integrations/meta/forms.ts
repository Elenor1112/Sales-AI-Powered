import { graphFetch } from "./client";
import type { MetaGraphForm, MetaPagedResponse } from "./types";

export async function getForms(pageId: string, pageAccessToken: string): Promise<MetaGraphForm[]> {
  const response = await graphFetch<MetaPagedResponse<MetaGraphForm>>(`${pageId}/leadgen_forms`, {
    access_token: pageAccessToken,
    fields: "id,name,status",
  });
  return response.data;
}
