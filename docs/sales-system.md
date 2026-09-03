# Vivid Sales CRM — System Overview

A multi-tenant sales management system that pulls leads from Meta Lead Ads (and other sources) and automatically distributes them to sales team members. See `docs/lead-distribution.md` and `docs/meta-integration.md` for deep dives on those two subsystems; this document covers the overall architecture.

## Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, React 19, Tailwind CSS v4, shadcn/ui, TanStack Query v5, Recharts.
- **Backend**: Next.js route handlers, organized into services/repositories/integrations layers under `src/server/`.
- **Database**: PostgreSQL (Neon in production), Prisma ORM 7 with the `@prisma/adapter-pg` driver adapter.
- **Auth**: Auth.js (NextAuth) v5, credentials provider, JWT sessions.
- **Validation**: Zod, enforced server-side on every mutating route.

## Directory structure

```text
src/
  app/                  Routes (pages + API route handlers)
  components/
    ui/                 shadcn/ui primitives
    sales/              App-specific composite components
  lib/                  Cross-cutting utilities (prisma client, auth config,
                         crypto, logger, error classes, pagination, API
                         client for the frontend)
  server/
    services/           Business logic (one file per domain: lead, task,
                         deal, sales-team, analytics, ...)
    repositories/        Data access (Prisma queries), always organizationId-scoped
    integrations/meta/   All Meta-specific code (see docs/meta-integration.md)
    auth/                Session resolution, RBAC permission matrix, route guards
    validation/          Zod schemas
    assignment/          The lead distribution engine (see docs/lead-distribution.md)
    notifications/       In-app notification dispatch
    jobs/                Background-ish work triggered inline (e.g. follow-up tasks)
  types/                Shared TypeScript types/DTOs
prisma/
  schema.prisma          Full data model
  seed.ts                Seed script
test/                    Vitest suite (unit + live-database integration tests)
docs/                    This documentation
```

## Multi-tenancy

Every organization-scoped table has an `organizationId` column. Tenant isolation is enforced **structurally**, not by convention: every repository function takes `organizationId` as a required first parameter and includes it in every `where` clause, so there is no code path that can query org-scoped data without it. `organizationId` itself is always read from the authenticated session server-side (`src/server/auth/session.ts`), never accepted from client input — see `test/auth/rbac.test.ts` for a live test proving a session from one organization cannot read another organization's lead data.

## Authentication and authorization

Auth.js v5 with the Credentials provider and JWT session strategy (a deliberate choice — Credentials and Auth.js's database-adapter session strategy are incompatible; JWT sessions embed `{id, organizationId, role}` and are the production-appropriate approach here). Three roles: `ADMIN`, `SALES_MANAGER`, `SALES_REP`, with a permission matrix in `src/server/auth/rbac.ts`. Every sensitive route is wrapped in `withAuth()` (`src/server/auth/guards.ts`), which resolves the session and optionally enforces a role allowlist before the handler runs — this is real server-side authorization; the Next.js `middleware.ts` redirect is a UX convenience only.

## Sales workflow

```text
Lead: NEW → ASSIGNED → CONTACTED → QUALIFIED → PROPOSAL → WON
                                                        ↘ LOST (with a required reason)
```

Every status transition writes a `LeadActivity` record and updates the relevant pipeline timestamp (`contactedAt`, `qualifiedAt`, `proposalAt`, `wonAt`, `lostAt`).

## Notifications

`src/server/notifications/dispatcher.ts` exposes `notify()`/`notifyRoles()`, currently delivering only to an in-app channel (a `Notification` database row, polled by the frontend). The dispatcher is intentionally the single integration point so additional channels (email, Slack, SMS) can be added later as new modules under `src/server/notifications/channels/` without changing any call site.

## Extending the system

- **New assignment strategy**: add a pure function to `src/server/assignment/assignment.strategies.ts`, add it to the `AssignmentStrategy` enum in `prisma/schema.prisma`, wire it into the `strategy ===` branch in `assignment.service.ts`, and add unit tests in `test/assignment/strategies.test.ts` following the existing pattern (no I/O, deterministic, easy to test in isolation).
- **New lead source**: add to the `LeadSource` enum; if it needs its own ingestion pipeline (like Meta), model it after `src/server/integrations/meta/` — keep it isolated in its own folder, and route new leads through `lead.service.ts`'s duplicate-detection + assignment path rather than duplicating that logic.
- **New notification channel**: add a module under `src/server/notifications/channels/`, register it in `dispatcher.ts`.
