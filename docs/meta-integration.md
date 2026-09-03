# Meta Integration Architecture

All Meta-specific code is isolated under `src/server/integrations/meta/`, kept independent of the rest of the app so it can be modified, tested, or replaced without touching lead/assignment logic.

```text
src/server/integrations/meta/
  client.ts        Real Graph API HTTP client — bounded retries, exponential
                    backoff on 429/5xx, request timeout, no token logging.
  oauth.ts          Signed OAuth state (CSRF protection), code exchange,
                    long-lived token exchange.
  permissions.ts    Single source of truth for requested OAuth scopes.
  pages.ts          List Pages the connected user manages; subscribe a page
                    to leadgen webhooks.
  forms.ts          List Lead Forms for a Page.
  leads.ts          Fetch a single lead by id; paginated leads-per-form.
  campaigns.ts      Campaign/ad-set/ad name enrichment (optional scopes;
                    degrades to raw IDs if not granted — never invents data).
  webhooks.ts       Signature verification + idempotent webhook processing.
  sync.ts           MetaLeadSyncService — historical and backup sync.
  normalize.ts      Maps raw Graph API field_data into the app's canonical
                    lead shape.
  types.ts          Raw Graph API response shapes + the MetaProvider
                    interface.
  provider.ts       The production MetaProvider singleton, built from the
                    modules above.
```

## The MetaProvider abstraction

Every module that needs to talk to Meta depends on the `MetaProvider` interface (`types.ts`), not directly on `client.ts`. `provider.ts` exports the one production implementation, built from real Graph API calls — there is no mock implementation used anywhere in application code. A mock satisfying the same interface exists only in test fixtures, so services under test can be exercised without live network calls while the actual runtime path is always real.

## Data flow

```text
Meta Account
    ↓
Facebook Pages (MetaPage)
    ↓
Lead Forms (MetaForm)
    ↓
Leads (Lead, source=META)
```

With attribution preserved on every lead: `metaPageId`, `metaFormId`, `metaCampaignId`, `metaAdSetId`, `metaAdId` — available to the assignment rule engine for page/form-based routing (see `docs/lead-distribution.md`).

## Normalization

Meta form field names vary per form (`full_name` vs `first_name`/`last_name`, `phone_number` vs `phone`, etc.). `normalize.ts` uses fuzzy alias matching for the well-known fields and buckets every other field into `customFields` JSON so no submitted data is ever silently dropped. The raw `field_data` array is preserved in `rawSourcePayload` for debugging/audit, but access tokens are never included in any payload that gets logged or stored alongside lead data.

## Webhook idempotency

Every `leadgen` webhook event has a deterministic fingerprint (`sha256(page_id:leadgen_id)`), inserted into `MetaWebhookEvent.eventFingerprint`, which has a database unique constraint. Redelivery of the same event hits that constraint and is dropped before any Graph API call or lead creation happens — verified in `test/meta/webhook-idempotency.test.ts` (identical payload delivered twice results in exactly one lead, one webhook event row, and the Graph API `getLeadById` call happening only once).

The webhook route always responds `200 OK` to Meta once the signature is verified, even if internal processing subsequently fails — this avoids Meta's indefinite retry behavior for a permanent bug; failures are instead recorded on the `MetaWebhookEvent` row and surfaced via an admin notification (`META_SYNC_FAILURE`).

## Historical and backup sync

`MetaLeadSyncService.syncConnection()` (`sync.ts`) is used for both the manual "Sync now" action (`POST /api/integrations/meta/sync`, mode `historical`) and the scheduled backup job (`POST /api/cron/meta-sync`, mode `backup`). It:

- Re-discovers pages/forms at the start of every run (so newly created forms are picked up automatically).
- Paginates through each form's leads using Graph API cursors.
- Feeds every lead through the same `createLeadFromMeta()` path used by webhooks — the exact same duplicate-detection and assignment logic applies, so there is no separate, divergent import code path.
- Is rate-limit aware: `client.ts` backs off and retries on Meta's 429 responses.
- Records a `MetaSync` row with fetched/created/updated/skipped/assigned/unassigned counts and any per-lead error messages, surfaced in the UI's sync history.

## Security

- Access tokens (user-level and per-page) are encrypted at rest with AES-256-GCM (`src/lib/crypto.ts`), keyed by `TOKEN_ENCRYPTION_KEY`.
- `GET /api/integrations/meta/status` never includes `accessTokenEncrypted` in its response.
- The OAuth callback validates a signed, time-limited (10 minute) state token before any token exchange, protecting against CSRF.
- The webhook POST handler verifies Meta's `X-Hub-Signature-256` HMAC against the raw request body using `META_APP_SECRET` before parsing or acting on the payload.
