import { graphFetch } from "./client";
import type { MetaGraphPage, MetaPagedResponse } from "./types";

export async function getPages(accessToken: string): Promise<MetaGraphPage[]> {
  const response = await graphFetch<MetaPagedResponse<MetaGraphPage>>("me/accounts", {
    access_token: accessToken,
    fields: "id,name,access_token,category",
  });
  return response.data;
}

export async function subscribePageToWebhooks(pageId: string, pageAccessToken: string): Promise<void> {
  await graphFetch(
    `${pageId}/subscribed_apps`,
    { access_token: pageAccessToken, subscribed_fields: "leadgen" },
    { method: "POST" }
  );
}
