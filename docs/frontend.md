# Frontend

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, and TanStack Query v5. No external Stitch design assets were available for this build, so the visual language (sidebar-based CRM shell, card-based metrics, badge-driven status/assignment indicators, table-first data views, a Kanban-style pipeline board) was implemented directly from the spec's written visual and functional requirements.

## Route structure

```text
/login                              Credentials sign-in
/sales                              Dashboard home (KPIs, unassigned alert)
/sales/leads                        Lead list, filters, create
/sales/leads/[id]                   Lead detail (profile, assignment, notes,
                                     activity timeline, tasks, deals)
/sales/unassigned                   Unassigned lead queue (retry / manual assign)
/sales/team                         Team management, workload, capacity
/sales/assignment                   Assignment settings + rules
/sales/deals                        Pipeline board (click-based stage changes)
/sales/tasks                        Task list, filters, create
/sales/analytics                    Charts: win/loss, revenue, source, assignment
/settings/integrations/meta         Meta connect/disconnect, sync status
```

`src/app/sales/layout.tsx` and `src/app/settings/layout.tsx` both wrap their route group in the shared `<SalesLayout>` shell (sidebar + header), resolving the session server-side and redirecting to `/login` if absent.

## Component structure

```text
src/components/sales/
  SalesLayout / SalesSidebar / SalesHeader / NotificationCenter   Shell
  MetricCard / LeadStatusBadge / LeadAssignmentBadge /
    CapacityIndicator / AssignmentFailureAlert / UserSelect       Shared primitives
  LeadTable / LeadFilters                                        Lead list
  LeadProfile / LeadActivityTimeline / LeadNotes /
    LeadAssignment / AssignmentHistory                            Lead detail
  UnassignedLeadQueue                                             Unassigned queue
  PipelineBoard / PipelineColumn / DealCard                       Deals pipeline
  AnalyticsCharts / WinLossChart / RevenueChart /
    SourceBreakdown / AssignmentAnalytics                         Analytics
  SalesTeamTable / SalespersonWorkload                            Team management
  AssignmentSettings / AssignmentRuleList / AssignmentRuleForm    Assignment config
  TaskList                                                        Tasks
  MetaIntegrationCard / MetaSyncStatus                            Meta settings
```

Page-local components (dialogs for creating leads/tasks/deals/rules/team members) live alongside their page under `src/app/sales/*/`.

## API hooks / data layer

`src/lib/api/*.ts` are typed fetch wrappers per domain (leads, tasks, deals, sales-teams, assignment, meta, notifications, analytics, users), all built on the shared `apiGet`/`apiPost`/`apiPatch`/`apiDelete` helpers in `src/lib/api/client.ts`, which throw a typed `ClientApiError` on any non-2xx response. Pages and components consume these through TanStack Query (`useQuery`/`useMutation`), with mutation `onSuccess` handlers invalidating the relevant query keys (e.g. assigning a lead invalidates `leads`, `unassigned`, `workload`, and the specific lead's own query).

## Design system

- shadcn/ui (base-ui primitives) for all interactive controls — dialogs, selects, dropdowns, popovers use base-ui's `render={<Trigger/>}` composition pattern (not Radix's `asChild`).
- Tailwind utility classes throughout; status/assignment badges use a small fixed color palette (blue=new, indigo=assigned, amber=contacted/warning, purple=qualified, cyan=proposal, emerald=won/positive, red=lost/failure, gray=neutral/unassigned) applied consistently across `LeadStatusBadge`, `LeadAssignmentBadge`, and chart color scales.
- Recharts for all charts (win/loss, revenue by salesperson, leads by source, assignment breakdowns).
- Loading states use `Skeleton` placeholders, never spinners. Empty states are explicit components with helpful copy (see `LeadTable`'s pattern, reused across every list/table). Error states show an inline message with retry rather than crashing.
- Fully responsive: the sidebar collapses into a `Sheet` drawer on mobile (via `SalesHeader`), tables scroll horizontally in their own container rather than overflowing the page, and the pipeline board's columns scroll horizontally on small screens.

## Known gaps / follow-ups

- The deals pipeline uses a click-based stage-change control rather than drag-and-drop, per the scoping decision to prioritize a working interaction over an unfinished DnD implementation this pass (`@dnd-kit` is already installed as a dependency if that's added later).
- The "New Deal"/"New Task" dialogs take a lead ID as a plain text input rather than a searchable lead picker, since no lead-search-for-picker endpoint exists yet.
- SALES_MANAGER currently sees all teams/leads in the organization rather than being scoped to only their own team (matches the current backend simplification — see `docs/lead-distribution.md`).

## Extending the dashboard

New pages go under `src/app/sales/` (or `src/app/settings/`) and are automatically wrapped in the shared shell by the route group layout. New API domains should get a corresponding typed module in `src/lib/api/` following the existing pattern, and new shared UI belongs in `src/components/sales/` — check there first before adding a one-off component, since most list/detail/form patterns already have a reusable base to extend.

## Extending assignment strategies (frontend side)

`AssignmentSettings.tsx`'s strategy `Select` and `AssignmentRuleForm.tsx`'s strategy `Select` both read from a fixed enum list matching `AssignmentStrategy` in `prisma/schema.prisma`. Adding a new strategy on the backend (see `docs/lead-distribution.md`) requires adding its value to both selects' option lists.
