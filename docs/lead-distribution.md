# Lead Distribution

This document explains how automatic lead assignment works end-to-end. The implementation lives under `src/server/assignment/`.

## How automatic assignment works

Every newly created lead (manual, Meta webhook, or Meta sync) is passed to `LeadAssignmentService.assignLead()` (`src/server/assignment/assignment.service.ts`) unless automatic assignment is disabled for the organization. The flow:

```text
New Lead
  ↓
Determine organization
  ↓
Resolve matching assignment rule (by priority) or fall back to org default
  ↓
Determine target sales team
  ↓
Load eligible team members (active, not paused, under capacity)
  ↓
Apply the resolved assignment strategy
  ↓
Assign the lead atomically (see Concurrency below)
  ↓
Record LeadAssignment + AssignmentHistory + LeadActivity + AuditLog
  ↓
Notify the assigned salesperson (and create a default follow-up task)
```

If no eligible salesperson exists, the lead is left `UNASSIGNED` (or `REASSIGNMENT_REQUIRED` on a failed retry) with a recorded failure reason, and admins/managers are notified — a lead is never silently dropped.

## Supported assignment strategies

Implemented in `src/server/assignment/assignment.strategies.ts` as pure, independently unit-tested functions (see `test/assignment/strategies.test.ts`):

- **ROUND_ROBIN** — cycles through the eligible team members in a stable order, advancing a persisted pointer.
- **LEAST_ASSIGNED** — picks whoever currently has the fewest active leads (statuses `NEW`, `ASSIGNED`, `CONTACTED`, `QUALIFIED`, `PROPOSAL` count as active; `WON`/`LOST` do not). Ties break by whoever was assigned longest ago.
- **WEIGHTED_ROUND_ROBIN** — like round robin, but members with a higher `assignmentWeight` receive proportionally more leads (smooth/interleaved, not bursty).
- **MANUAL** — an admin or sales manager explicitly picks the assignee via the API/UI.

## How round-robin state is stored

`AssignmentState` (one row per organization+team+strategy) persists `roundRobinIndex` and `lastAssignedUserId` in the database — never in memory — so the pointer survives across multiple server instances, concurrent webhook events, application restarts, and scheduled sync jobs.

## Concurrency safety

This is the most important correctness property of the system: two webhook events (or a webhook racing a manual sync) must never assign the same lead to two different salespeople, and round-robin must never skip or double-assign a person under concurrent load.

The whole assignment decision is executed inside a single Postgres `SERIALIZABLE` transaction:

1. The `Lead` row is locked with `SELECT ... FOR UPDATE` first. If the lead is already `ASSIGNED` and this is an automatic trigger, the call short-circuits and returns the existing assignment (idempotent against duplicate webhook delivery).
2. The relevant `AssignmentState` row is also locked with `FOR UPDATE` before its pointer is read, so two concurrent computations for the same team can't both read the same pointer value.
3. All resulting writes (lead fields, `LeadAssignment`, `AssignmentHistory`, updated `AssignmentState`, `LeadActivity`, `AuditLog`) happen in the same transaction — all or nothing.
4. Postgres may abort a transaction with a genuine serialization conflict (`SQLSTATE 40001`) when two transactions truly race for the same locked rows. This is expected, correct behavior, not a bug — the service automatically retries (up to 10 attempts, capped exponential backoff) rather than surfacing the error to the caller.
5. Notifications and the default follow-up task are created **after** the transaction commits, so a notification failure never rolls back a successful assignment.

This is verified with live integration tests against a real Postgres database in `test/assignment/concurrency.test.ts` — firing many simultaneous assignment calls at the same lead and at the same team, and asserting exactly one winner and a mathematically correct round-robin distribution every time.

## How capacity is enforced

`src/server/assignment/assignment.capacity.ts` computes each team member's current active lead count and excludes anyone at or over their configured `maxActiveLeads` when `AssignmentSettings.enforceCapacity` is true. A `null` `maxActiveLeads` means unlimited capacity for that member.

## How assignment rules are prioritized

`AssignmentRule` rows are organization-scoped and evaluated in ascending `priority` order (lower number = evaluated first); the first rule whose criteria (Meta page/form/campaign/ad set/ad, or lead source) match the incoming lead wins, and its configured team + strategy are used. If no rule matches, the organization's default team and default strategy (from `AssignmentSettings`) are used. A rule must specify at least one matching criterion — a rule with none would match everything, which is almost certainly not intended, and is rejected by validation.

## How unassigned leads are handled

Leads that can't be assigned (no eligible member, no configured team, or automatic assignment disabled) get `assignmentStatus = UNASSIGNED` and appear in the unassigned queue (`/sales/unassigned`, backed by `GET /api/leads/unassigned` and `GET /api/assignment/unassigned`), which shows how long each lead has been waiting, the failure reason, and any matching rule/team for manual follow-up.

## How to manually reassign leads

`POST /api/leads/:id/assign` (for currently-unassigned leads) and `POST /api/leads/:id/reassign` (for already-assigned leads) both route through the same `assignLead()` service with `trigger: "MANUAL"`, restricted to ADMIN and SALES_MANAGER roles. Manual assignment/reassignment always creates an `AssignmentHistory` record and notifies the new assignee (and, on reassignment, the previous assignee).

## How to retry failed assignments

`POST /api/assignment/retry/:leadId` re-invokes the automatic assignment engine for a specific lead — useful after adding capacity, un-pausing a rep, or fixing a misconfigured rule.

## How notifications work

See `docs/sales-system.md` for the general notification architecture. Assignment-specific notifications (`LEAD_AUTO_ASSIGNED`, `LEAD_MANUAL_ASSIGNED`, `LEAD_REASSIGNED`, `NO_ELIGIBLE_SALESPERSON`) are dispatched from `src/server/assignment/assignment.notifications.ts`.

## How historical imports are assigned

`AssignmentSettings.importAssignmentMode` controls whether Meta historical/backup sync assigns imported leads automatically:

- `ASSIGN_IMPORTED_LEADS` (**default**) — every imported lead runs through the normal assignment engine, exactly like a real-time webhook lead.
- `DO_NOT_ASSIGN_IMPORTED_LEADS` — imported leads are created but left unassigned, for organizations that want to review a historical backfill before distributing it.

## Documented simplifications in this pass

- The default follow-up task ("Contact new lead", due `DEFAULT_FOLLOWUP_MINUTES` after assignment) is controlled by an environment variable rather than a dedicated `AssignmentSettings` column, to avoid expanding the schema beyond the spec's exact field list. Set `DEFAULT_FOLLOWUP_MINUTES=0` to disable it.
- SALES_MANAGER is not yet restricted to only their own team's leads/assignment rules (they currently see/manage all teams in the organization) — full team-scoped manager permissions are a natural follow-up.
