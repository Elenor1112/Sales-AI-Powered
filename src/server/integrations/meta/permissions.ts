/**
 * Centralized list of Meta permissions this app requests. Used by both the
 * OAuth URL builder (oauth.ts) and the post-connect permission check, so
 * scopes are never duplicated/drifted between the two.
 */
export const META_REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_read_engagement",
  "leads_retrieval",
] as const;

/**
 * Optional scopes that enable campaign/ad-set/ad name enrichment (spec §26:
 * "do not invent Meta metrics the API does not provide"). If not granted,
 * campaigns.ts falls back to storing raw IDs without names rather than
 * failing the connection.
 */
export const META_OPTIONAL_SCOPES = ["ads_management", "ads_read"] as const;

export function getAllRequestedScopes(): string[] {
  return [...META_REQUIRED_SCOPES, ...META_OPTIONAL_SCOPES];
}
