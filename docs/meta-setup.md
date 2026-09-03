# Meta (Facebook/Instagram) Lead Ads Setup

This document covers what must be configured inside Meta's developer console and in this app's environment variables to enable real Meta Lead Ads ingestion. None of this can be automated from the codebase — it requires a real Facebook Developer account and app review in production.

## 1. Create a Meta Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and create a new app (type: Business).
2. Note the **App ID** and **App Secret** from Settings → Basic.

## 2. Configure OAuth

1. Add the **Facebook Login** product to your app.
2. Under Facebook Login → Settings, add your OAuth redirect URI:
   ```
   https://<your-domain>/api/integrations/meta/callback
   ```
   For local development: `http://localhost:3000/api/integrations/meta/callback`.

## 3. Configure the webhook

1. Add the **Webhooks** product to your app.
2. Subscribe to the `page` object, `leadgen` field.
3. Set the callback URL to:
   ```
   https://<your-domain>/api/webhooks/meta
   ```
4. Set a **Verify Token** — any string you choose — and put the same value in `META_WEBHOOK_VERIFY_TOKEN`. Meta calls `GET /api/webhooks/meta` with this token during setup; the app echoes back `hub.challenge` only if it matches.
5. For each Page you connect through the app's OAuth flow, the app calls `POST {page-id}/subscribed_apps` to subscribe that specific page to `leadgen` events — this happens automatically after a successful OAuth connect (see `src/server/integrations/meta/pages.ts`).

## 4. Configure required permissions

The app requests these scopes during OAuth (see `src/server/integrations/meta/permissions.ts`, the single source of truth):

- `pages_show_list`
- `pages_manage_metadata`
- `pages_read_engagement`
- `leads_retrieval`

Optional (for campaign/ad-set/ad name enrichment in analytics — the app degrades gracefully without these, storing raw Meta IDs instead of names):

- `ads_management`
- `ads_read`

## 5. Add environment variables

```env
META_APP_ID=<your app id>
META_APP_SECRET=<your app secret>
META_REDIRECT_URI=https://<your-domain>/api/integrations/meta/callback
META_WEBHOOK_VERIFY_TOKEN=<a string you choose>
META_API_VERSION=v20.0
TOKEN_ENCRYPTION_KEY=<32-byte key, base64-encoded — generate with `openssl rand -base64 32`>
CRON_SECRET=<a random secret for the backup sync cron endpoint>
```

`META_APP_SECRET` and `TOKEN_ENCRYPTION_KEY` are never sent to the browser and are redacted from application logs (`src/lib/logger.ts`).

## 6. Connect Meta from the application

1. Log in as an ADMIN user.
2. Go to Settings → Meta Integration (`/settings/integrations/meta`).
3. Click "Connect Meta" — this redirects to `GET /api/integrations/meta/connect`, which builds a signed OAuth state token and redirects to Meta's authorization dialog.
4. After you grant permissions, Meta redirects back to `/api/integrations/meta/callback`, which validates the state, exchanges the authorization code for a short-lived token, upgrades it to a long-lived token, encrypts it (AES-256-GCM) and stores it, then automatically discovers and stores your connected Pages and their Lead Forms.

## 7. Select pages/forms and configure routing

All Pages you manage (that were granted during OAuth) and their Lead Forms are automatically discovered and stored. Use the Assignment Rules page (`/sales/assignment`) to route specific Meta Pages or Forms to specific sales teams and strategies — see `docs/lead-distribution.md`.

## 8. Test locally

Meta's webhook needs a public HTTPS URL to reach your local dev server. Use any secure tunneling tool (ngrok, Cloudflare Tunnel, etc. — this app does not hardcode a specific provider):

```text
localhost:3000
   ↓
secure tunnel (e.g. ngrok http 3000)
   ↓
https://<random-id>.ngrok.io
   ↓
Meta Webhook configured to point here
```

Update the webhook callback URL and `META_REDIRECT_URI` to the tunnel's HTTPS URL while testing, then submit a test lead through Meta's Lead Ads Testing Tool.

## 9. Submit for Meta App Review (production)

`leads_retrieval` and `pages_manage_metadata` require App Review before your app can use them with real (non-admin/tester) Pages in production. Follow Meta's App Review process, providing a screencast of the OAuth connect flow and lead import working end-to-end.

## 10. Move to production

- Update `META_REDIRECT_URI` and the webhook callback URL to your production domain.
- Ensure `TOKEN_ENCRYPTION_KEY` and `META_APP_SECRET` are set as secrets in your hosting provider, not committed to source control.
- Configure the backup sync cron job (see `docs/lead-distribution.md`) pointing at `POST /api/cron/meta-sync` with `Authorization: Bearer <CRON_SECRET>`.
