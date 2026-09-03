# API Reference

All routes live under `src/app/api/`. Every route (except the Meta OAuth callback and the Meta/cron webhooks, which authenticate differently — see below) is wrapped in `withAuth()` (`src/server/auth/guards.ts`), which resolves the session server-side and optionally enforces a role allowlist. `organizationId` always comes from the authenticated session, never from client input, so no request can act on another organization's data.

Responses follow a consistent shape. Success: the resource(s) directly, or `{ items, page, pageSize, total, totalPages }` for paginated lists. Errors: `{ error: { code, message, details? } }` with an appropriate HTTP status (`src/lib/errors.ts`).

## Authentication

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/callback/credentials` | NextAuth credentials sign-in (handled by the Auth.js route catch-all) |
| GET/POST | `/api/auth/*` | NextAuth.js internals (session, csrf, signout, etc.) |

## Leads

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/leads` | any | Paginated, filterable (search, assignedUserId, assignedTeamId, assignmentStatus, source, status, priority, campaign/form, date range), sortable. SALES_REP is auto-scoped to their own leads. |
| POST | `/api/leads` | any | Creates a lead; runs duplicate detection (email/phone) then automatic assignment if enabled. |
| GET | `/api/leads/:id` | any (own lead for REP) | |
| PATCH | `/api/leads/:id` | any (own lead for REP) | |
| DELETE | `/api/leads/:id` | ADMIN, SALES_MANAGER | |
| POST | `/api/leads/:id/assign` | ADMIN, SALES_MANAGER | Assign a currently-unassigned lead. |
| POST | `/api/leads/:id/reassign` | ADMIN, SALES_MANAGER | Reassign an already-assigned lead. |
| GET | `/api/leads/:id/assignment-history` | any (own lead for REP) | |
| POST | `/api/leads/:id/status` | any (own lead for REP) | `lostReason` required when status is `LOST`. |
| GET/POST | `/api/leads/:id/notes` | any (own lead for REP) | |
| GET | `/api/leads/:id/activities` | any (own lead for REP) | |
| POST | `/api/leads/:id/tags` | any (own lead for REP) | Accepts `tagIds` and/or `tagNames` (auto-creates new tags). |
| GET | `/api/leads/unassigned` | any | Same data as `/api/assignment/unassigned`. |

## Tasks

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/tasks` | Filterable by status, assignedUserId, leadId, dealId, overdue. |
| GET/PATCH | `/api/tasks/:id` | |
| POST | `/api/tasks/:id/complete` | |

## Deals

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/deals` | Filterable by stage, ownerId. |
| GET/PATCH | `/api/deals/:id` | Stage transitions to WON/LOST set `wonAt`/`lostAt` and notify the owner. |

## Analytics (ADMIN, SALES_MANAGER only)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/sales/analytics` | `?metric=leads\|conversion\|revenue&groupBy=salesperson\|team\|source&dateFrom=&dateTo=` |
| GET | `/api/sales/analytics/assignments` | Assignment-specific breakdowns (by strategy, capacity utilization, reassignment count). |
| GET | `/api/sales/workload` | Per-salesperson current workload/capacity. Alias of `/api/assignment/workload`. |

## Notifications

| Method | Path | Notes |
|---|---|---|
| GET | `/api/notifications` | `?unreadOnly=true` supported. |
| POST | `/api/notifications/:id/read` | |
| POST | `/api/notifications/read-all` | |

## Sales Teams (ADMIN, SALES_MANAGER for mutations)

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/sales-teams` | |
| GET/PATCH | `/api/sales-teams/:id` | |
| DELETE | `/api/sales-teams/:id` | ADMIN only. Rejected if the team is the org's configured default assignment team. |
| GET/POST | `/api/sales-teams/:id/members` | |
| PATCH/DELETE | `/api/sales-teams/:id/members/:userId` | |

## Assignment Configuration (ADMIN, SALES_MANAGER for mutations)

| Method | Path | Notes |
|---|---|---|
| GET/PATCH | `/api/assignment/settings` | |
| GET/POST | `/api/assignment/rules` | |
| PATCH/DELETE | `/api/assignment/rules/:id` | |
| GET | `/api/assignment/workload` | |
| GET | `/api/assignment/unassigned` | |
| POST | `/api/assignment/retry/:leadId` | Re-runs automatic assignment for one lead. |

## Meta Integration

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/integrations/meta/connect` | ADMIN | Redirects to Meta's OAuth dialog with a signed CSRF state token. |
| GET | `/api/integrations/meta/callback` | — | Called by Meta directly; identity comes from the signed state token, not a session. |
| GET | `/api/integrations/meta/status` | any | Never returns encrypted access tokens. |
| POST | `/api/integrations/meta/sync` | ADMIN, SALES_MANAGER | Triggers a full historical sync; returns fetched/created/updated/skipped/assigned/unassigned counts. |
| POST | `/api/integrations/meta/disconnect` | ADMIN | Preserves historical leads; only deactivates the connection. |
| GET/POST | `/api/webhooks/meta` | — | GET is Meta's subscription verification handshake; POST is signature-verified (`X-Hub-Signature-256`) and idempotent (deduped by a fingerprint of page_id+leadgen_id). |
| POST | `/api/cron/meta-sync` | — | Requires `Authorization: Bearer <CRON_SECRET>`. Runs backup sync for every connected organization. |

## Error codes

Common `error.code` values: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `CONFLICT` (409), `INTERNAL_ERROR` (500). Assignment-specific failures surface as `VALIDATION_ERROR` with a descriptive message (e.g. "No eligible salesperson is available") — assignment failures are recorded on the lead rather than thrown as hard errors where the spec calls for graceful unassigned-queue fallback.
