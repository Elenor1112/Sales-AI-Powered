# Build a Production-Ready Sales Management System with Meta Lead Ads Integration and Automatic Lead Distribution

You are building a completely new application from scratch. There is no existing codebase to audit or preserve.

Build a complete, production-ready Sales Management System that pulls leads from Meta Lead Ads and automatically distributes them to sales team members.

The system must include:

- Database
- Backend/API
- Authentication and authorization
- Organizations and multi-tenancy
- Sales workflow
- Meta Lead Ads integration
- Meta OAuth
- Meta webhooks
- Historical lead synchronization
- Automatic lead distribution
- Manual assignment and reassignment
- Assignment rules and configuration
- Notifications
- Analytics APIs
- Validation
- Error handling
- Logging0
- Tests
- Frontend implementation based on the Stitch design instructions included below

Use a clean, modular, scalable architecture.

The primary business flow is:

```text
Meta Lead Ad
      ↓
Meta Webhook or Scheduled Sync
      ↓
Fetch Complete Lead Data
      ↓
Normalize Lead
      ↓
Check for Duplicate
      ↓
Create CRM Lead
      ↓
Determine Eligible Sales Team Members
      ↓
Apply Assignment Rule
      ↓
Assign Lead Automatically
      ↓
Notify Assigned Salesperson
      ↓
Salesperson Works Lead Through Pipeline
```

The system must not only import Meta leads. It must automatically distribute each new lead to an eligible sales team member.

---

# 1. REQUIRED TECHNOLOGY STACK

Use the following stack unless there is a strong technical reason to choose an equivalent:

## Frontend

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui or an equivalent accessible component system
- TanStack Query for server-state management
- Recharts or an equivalent charting library
- Lucide React or an equivalent icon library

## Backend

Use Next.js route handlers/server actions or a clearly separated backend layer within the same application.

The backend must be modular and organized into:

```text
src/
  app/
  components/
  lib/
  server/
    services/
    repositories/
    integrations/
    auth/
    validation/
    jobs/
    notifications/
    assignment/
  types/
```

Adapt the structure if needed, but keep business logic separate from UI components.

## Database

Use Neon PostgreSQL.

Use Prisma ORM unless there is a strong reason to use Drizzle ORM.

The database must be configured through:

```env
DATABASE_URL=
DIRECT_URL=
```

Use migrations and seed scripts.

---

# 2. APPLICATION OBJECTIVE

Build a complete sales CRM capable of managing leads from multiple sources, especially:

- Meta / Facebook Lead Ads
- Instagram Lead Ads
- Website leads
- Manual leads
- Future integrations

The most important source is Meta Lead Ads.

The system must automatically pull Meta leads and distribute them to sales team members.

The sales workflow must support:

```text
Lead
 ↓
New
 ↓
Assigned
 ↓
Contacted
 ↓
Qualified
 ↓
Proposal
 ↓
Won
 ↓
Customer
```

And:

```text
Lead
 ↓
Lost
```

with a configurable lost reason.

Every Meta lead should move through this process:

```text
Imported from Meta
 ↓
Automatically assigned
 ↓
Salesperson notified
 ↓
Salesperson contacts lead
 ↓
Lead progresses through pipeline
```

---

# 3. AUTHENTICATION AND AUTHORIZATION

Implement authentication from scratch.

Use a secure authentication solution compatible with Next.js, such as Auth.js/NextAuth with a database adapter, or another production-ready solution.

Support:

- Email/password authentication
- Secure password hashing
- Session management
- Logout
- Password reset structure
- Protected routes
- Server-side authorization

Support these roles:

```text
ADMIN
SALES_MANAGER
SALES_REP
```

Permissions should include:

## ADMIN

- Full access
- Manage users
- Manage sales teams
- Manage Meta integrations
- Configure lead distribution rules
- Configure assignment settings
- View all analytics
- Manage all leads, deals, tasks, and activities
- Manually assign and reassign any lead

## SALES\_MANAGER

- View team leads
- Assign and reassign team leads
- Configure team assignment rules if permitted
- View team analytics
- Manage deals and tasks
- Manage sales pipeline
- View assignment history
- View unassigned leads
- Reassign leads when sales representatives are unavailable

## SALES\_REP

- View leads assigned to them
- Update assigned leads
- Add notes
- Create and complete tasks
- Update permitted statuses
- Manage assigned deals
- View their own assignment history
- Receive notifications for newly assigned leads

Every sensitive endpoint must verify authorization server-side.

---

# 4. MULTI-TENANCY

Implement organizations/workspaces from the beginning.

A user belongs to an organization.

All sales data must be scoped by organization.

A user from Organization A must never be able to access Organization B's:

- Leads
- Deals
- Tasks
- Notes
- Activities
- Meta connections
- Assignment rules
- Sales teams
- Analytics
- Users

Every relevant database table must include an organization/workspace relationship.

Treat tenant isolation as a critical security requirement.

---

# 5. SALES TEAM MANAGEMENT

The system must support sales team members and eligibility for automatic lead distribution.

A sales team member is an active user with the `SALES_REP` role, unless the organization configures another eligible role.

Support:

- Active/inactive sales representatives
- Sales team membership
- Team assignment
- Availability status
- Maximum active lead capacity
- Current assigned lead count
- Assignment eligibility
- Temporary pause from automatic assignment
- Working hours structure for future use
- Team-level assignment rules

Create a sales team management structure that allows administrators and sales managers to:

- Add users to the sales team
- Remove users from the sales team
- Activate or deactivate assignment eligibility
- Pause a salesperson from receiving new leads
- Set a maximum active lead capacity
- View current workload
- View assignment performance
- View last assignment time
- View total assigned leads
- View open leads
- View won leads

A salesperson must not receive new automatic assignments if:

- Their account is inactive
- They are not part of the eligible sales team
- They are paused
- They have reached their configured capacity
- They do not have permission to receive leads

If no eligible salesperson is available, the lead must remain unassigned and be placed into an unassigned queue.

The system must notify administrators or sales managers when a lead cannot be automatically assigned.

---

# 6. LEAD DISTRIBUTION REQUIREMENTS

Automatic lead distribution is a core requirement.

Every newly imported Meta lead must be evaluated by the assignment engine.

Create a dedicated service:

```text
LeadAssignmentService
```

or:

```text
LeadDistributionService
```

The service must:

1. Receive a newly created or imported lead.
2. Identify the organization.
3. Identify the applicable sales team.
4. Retrieve the organization's active assignment configuration.
5. Determine eligible sales team members.
6. Apply the configured assignment strategy.
7. Select one salesperson.
8. Assign the lead atomically.
9. Create assignment history.
10. Create a lead activity.
11. Create an audit log.
12. Notify the assigned salesperson.
13. Return the assignment result.
14. Handle the unassigned case safely.

The assignment operation must be idempotent and concurrency-safe.

If two Meta webhook events arrive at the same time, the same lead must not be assigned to two different salespeople.

Use database transactions and appropriate locking or unique constraints.

---

# 7. ASSIGNMENT STRATEGIES

Support the following assignment strategies.

## Round Robin

Distribute leads sequentially across eligible sales team members.

Example:

```text
Lead 1 → Sarah
Lead 2 → Michael
Lead 3 → David
Lead 4 → Sarah
```

The round-robin pointer must be stored persistently in the database.

Do not calculate round robin only in memory.

The system must remain correct across:

- Multiple server instances
- Concurrent webhook events
- Application restarts
- Background workers
- Scheduled synchronization

## Least Assigned

Assign the new lead to the eligible salesperson with the fewest active leads.

## Weighted Round Robin

Allow salespeople to have configurable weights.

Example:

```text
Sarah: weight 2
Michael: weight 1
David: weight 1
```

The distribution should approximately follow the configured weights.

## Manual Assignment

Allow administrators and sales managers to manually assign or reassign leads.

## Source-Based Assignment

Support future assignment rules based on:

- Meta page
- Meta form
- Campaign
- Ad set
- Ad
- Lead source
- Country
- Language
- Custom field
- Product or service interest

The initial implementation must support at least Meta page/form-based routing if practical.

## Team-Based Assignment

Allow different Meta pages or forms to route to different sales teams.

Example:

```text
Meta Form A → Sales Team A
Meta Form B → Sales Team B
```

If no specific routing rule matches, use the organization's default sales team.

---

# 8. ASSIGNMENT CONFIGURATION

Create organization-level assignment settings.

Support:

- Default assignment strategy
- Default sales team
- Automatic assignment enabled/disabled
- Assignment capacity enforcement
- Assignment notification enabled/disabled
- Fallback behavior
- Reassignment behavior
- Whether inactive users are excluded
- Whether paused users are excluded
- Whether capacity limits are enforced

Example configuration:

```text
Assignment strategy: ROUND_ROBIN
Default team: Inbound Sales
Automatic assignment: ENABLED
Capacity enforcement: ENABLED
Fallback: UNASSIGNED_QUEUE
Notify managers when unassigned: ENABLED
```

Create assignment rules with priority ordering.

Example:

```text
Rule 1:
Meta Form = "Enterprise Demo"
Team = Enterprise Sales
Strategy = LEAST_ASSIGNED

Rule 2:
Meta Page = "Main Business Page"
Team = Inbound Sales
Strategy = ROUND_ROBIN

Fallback:
Default Sales Team
Strategy = ROUND_ROBIN
```

Rules must be organization-scoped.

Rules must be evaluated in deterministic priority order.

---

# 9. ASSIGNMENT DATABASE SCHEMA

Use Neon PostgreSQL with Prisma or Drizzle.

Create normalized models for assignment functionality.

## Sales Teams

Fields:

- id
- organization\_id
- name
- description
- is\_active
- created\_at
- updated\_at

## Sales Team Members

Fields:

- id
- organization\_id
- team\_id
- user\_id
- is\_active
- is\_paused
- assignment\_weight
- max\_active\_leads
- last\_assigned\_at
- created\_at
- updated\_at

Create unique constraints for:

```text
organization_id + team_id + user_id
```

## Assignment Settings

Fields:

- id
- organization\_id
- automatic\_assignment\_enabled
- default\_strategy
- default\_team\_id
- enforce\_capacity
- notify\_assigned\_user
- notify\_managers\_on\_unassigned
- fallback\_behavior
- created\_at
- updated\_at

## Assignment Rules

Fields:

- id
- organization\_id
- name
- priority
- is\_active
- source
- meta\_page\_id
- meta\_form\_id
- meta\_campaign\_id
- meta\_ad\_set\_id
- meta\_ad\_id
- conditions JSON/JSONB
- team\_id
- strategy
- created\_at
- updated\_at

## Assignment State

Fields:

- id
- organization\_id
- team\_id
- strategy
- round\_robin\_index
- last\_assigned\_user\_id
- updated\_at

Use this to persist round-robin state safely.

## Lead Assignments

Fields:

- id
- organization\_id
- lead\_id
- assigned\_user\_id
- team\_id
- assignment\_method
- assignment\_rule\_id
- assignment\_reason
- created\_at

Use this to record the assignment event.

## Assignment History

Track all lead assignment changes.

Fields:

- id
- organization\_id
- lead\_id
- previous\_user\_id
- new\_user\_id
- previous\_team\_id
- new\_team\_id
- changed\_by\_user\_id
- assignment\_method
- assignment\_rule\_id
- reason
- created\_at

---

# 10. DATABASE SCHEMA

Use Neon PostgreSQL with Prisma or Drizzle.

Create a normalized schema for the following entities.

## Organizations

Fields:

- id
- name
- slug
- created\_at
- updated\_at

## Users

Fields:

- id
- organization\_id
- name
- email
- password\_hash if using credentials authentication
- role
- avatar\_url
- is\_active
- created\_at
- updated\_at

## Sales Leads

Fields should include at minimum:

- id
- organization\_id
- name
- first\_name
- last\_name
- email
- phone
- company
- job\_title
- source
- status
- priority
- assigned\_user\_id
- assigned\_team\_id
- assignment\_status
- assignment\_method
- notes\_summary
- estimated\_value
- currency
- lost\_reason
- meta\_lead\_id
- meta\_page\_id
- meta\_form\_id
- meta\_campaign\_id
- meta\_ad\_set\_id
- meta\_ad\_id
- custom\_fields JSON/JSONB
- raw\_source\_payload JSON/JSONB where appropriate
- created\_at
- updated\_at
- contacted\_at
- qualified\_at
- proposal\_at
- won\_at
- lost\_at

Assignment status should support:

```text
UNASSIGNED
ASSIGNED
REASSIGNMENT_REQUIRED
```

Create appropriate indexes and unique constraints.

The Meta lead ID must be unique within the appropriate integration scope.

## Lead Sources

Support:

```text
META
FACEBOOK
INSTAGRAM
WEBSITE
MANUAL
OTHER
```

Keep this extensible.

## Lead Activities

Track every important action:

- Created
- Status changed
- Assigned
- Reassigned
- Assignment failed
- Note added
- Contacted
- Qualified
- Proposal sent
- Won
- Lost
- Imported
- Meta synchronized
- Task created
- Task completed
- Deal created
- Deal updated

Fields:

- id
- organization\_id
- lead\_id
- user\_id
- activity\_type
- metadata JSON/JSONB
- created\_at

## Notes

Allow multiple notes per lead.

Fields:

- id
- organization\_id
- lead\_id
- user\_id
- content
- created\_at
- updated\_at

## Tasks / Follow-ups

Fields:

- id
- organization\_id
- lead\_id
- deal\_id if applicable
- assigned\_user\_id
- created\_by\_user\_id
- title
- description
- due\_date
- status
- priority
- completed\_at
- created\_at
- updated\_at

Task statuses:

```text
PENDING
IN_PROGRESS
COMPLETED
CANCELLED
```

## Tags

Support lead tagging.

Create:

- tags
- lead\_tags

## Deals

A lead can eventually become a deal.

Fields:

- id
- organization\_id
- lead\_id
- owner\_id
- name
- value
- currency
- stage
- expected\_close\_date
- probability
- created\_at
- updated\_at
- won\_at
- lost\_at

Deal stages:

```text
QUALIFICATION
PROPOSAL
NEGOTIATION
WON
LOST
```

## Notifications

Fields:

- id
- organization\_id
- user\_id
- type
- title
- message
- metadata JSON/JSONB
- read\_at
- created\_at

## Audit Logs

Fields:

- id
- organization\_id
- user\_id
- action
- entity\_type
- entity\_id
- metadata JSON/JSONB
- created\_at

---

# 11. META INTEGRATION

Build a real Meta Lead Ads integration using the Meta Graph API.

Do not use fake or mock Meta functionality in production.

The architecture must support:

```text
Meta Account
    ↓
Facebook Pages
    ↓
Lead Forms
    ↓
Leads
```

And attribution:

```text
Campaign
Ad Set
Ad
Form
Page
```

where available.

The Meta integration must provide the attribution data required by the assignment engine.

Keep all Meta-specific code isolated:

```text
src/server/integrations/meta/
  client.ts
  oauth.ts
  permissions.ts
  pages.ts
  forms.ts
  leads.ts
  campaigns.ts
  webhooks.ts
  sync.ts
  normalize.ts
  types.ts
```

Keep assignment-specific code isolated:

```text
src/server/assignment/
  assignment.service.ts
  assignment.repository.ts
  assignment.rules.ts
  assignment.strategies.ts
  assignment.capacity.ts
  assignment.notifications.ts
  assignment.types.ts
```

---

# 12. META ENVIRONMENT VARIABLES

Create and document:

```env
DATABASE_URL=
DIRECT_URL=

AUTH_SECRET=
NEXTAUTH_URL=

META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=
META_WEBHOOK_VERIFY_TOKEN=
META_API_VERSION=v20.0

TOKEN_ENCRYPTION_KEY=

CRON_SECRET=
```

Never expose these to the browser:

- META\_APP\_SECRET
- TOKEN\_ENCRYPTION\_KEY
- Meta access tokens
- DATABASE\_URL
- DIRECT\_URL
- CRON\_SECRET

---

# 13. META OAUTH

Create a proper OAuth connection flow.

Required flow:

```text
Sales Dashboard
      ↓
Connect Meta
      ↓
Meta OAuth
      ↓
User grants permissions
      ↓
Meta callback
      ↓
Backend validates state
      ↓
Exchange authorization code
      ↓
Store encrypted credentials
      ↓
Fetch pages and forms
      ↓
Configure routing and assignment
      ↓
Connection established
```

Create endpoints similar to:

```text
GET /api/integrations/meta/connect
GET /api/integrations/meta/callback
GET /api/integrations/meta/status
POST /api/integrations/meta/disconnect
```

Implement:

- OAuth state protection
- Secure callback validation
- Correct redirect URI handling
- Token exchange
- Long-lived token handling where applicable
- Permission validation
- Secure token encryption
- Connection ownership by organization
- Connection status tracking
- Page and form discovery after connection
- Assignment routing readiness after connection

Use centralized Meta permissions configuration.

---

# 14. META CONNECTION DATABASE

Create models/tables such as:

```text
MetaConnection
MetaPage
MetaForm
MetaCampaign
MetaAdSet
MetaAd
MetaSync
MetaWebhookEvent
```

Store:

- Meta IDs
- Organization ownership
- Connected user
- Page names
- Form names
- Campaign metadata
- Synchronization status
- Last sync time
- Error messages
- Created and updated timestamps

Access tokens must be encrypted at rest.

Never return private access tokens to the frontend.

---

# 15. META LEAD IMPORT

Implement historical lead synchronization.

When a Meta account/page/form is connected:

```text
Fetch Pages
 ↓
Fetch Forms
 ↓
Fetch existing leads
 ↓
Normalize lead data
 ↓
Check duplicates
 ↓
Create or update CRM lead
 ↓
Run assignment engine
 ↓
Record synchronization result
 ↓
Notify assigned salesperson
```

Create an explicit service:

```text
MetaLeadSyncService
```

The sync must be:

- Paginated
- Retryable
- Idempotent
- Rate-limit aware
- Logged
- Organization-scoped
- Assignment-aware

Every newly created Meta lead must be passed through the assignment engine.

Do not bypass automatic distribution during historical synchronization unless explicitly configured.

Support a configuration option for historical imports:

```text
ASSIGN_IMPORTED_LEADS
DO_NOT_ASSIGN_IMPORTED_LEADS
```

The default should be clearly documented.

Never import duplicate leads.

Use the Meta lead ID as an external unique identifier.

Support manual synchronization through:

```text
POST /api/integrations/meta/sync
```

Return synchronization results including:

- Leads fetched
- Leads created
- Leads updated
- Leads skipped as duplicates
- Leads assigned
- Leads left unassigned
- Assignment failures
- Errors

---

# 16. META WEBHOOKS

Implement real-time Meta Lead Ads webhooks.

Create:

```text
GET /api/webhooks/meta
POST /api/webhooks/meta
```

The GET endpoint must support Meta webhook verification.

The POST endpoint must:

1. Validate the webhook request.
2. Verify the payload structure.
3. Extract the lead ID.
4. Identify the connected Meta page/account.
5. Fetch complete lead information from Meta.
6. Normalize the data.
7. Check whether the lead already exists.
8. Create or update the CRM lead.
9. Record the webhook event.
10. Create a lead activity.
11. Run the automatic assignment engine.
12. Create assignment history.
13. Notify the assigned salesperson.
14. Notify managers if assignment fails.
15. Return the correct response to Meta.

Webhook processing must be idempotent.

If the same event arrives multiple times, the system must not:

- Create duplicate leads
- Create duplicate assignments
- Send duplicate assignment notifications
- Advance the lead incorrectly

Store webhook event IDs or deterministic event fingerprints to prevent duplicate processing.

---

# 17. META LEAD NORMALIZATION

Meta lead fields are not always identical.

Build a normalization layer.

Map Meta data into:

```text
first_name
last_name
name
email
phone
company
job_title
custom_fields
```

Also preserve attribution fields:

```text
meta_lead_id
meta_page_id
meta_form_id
meta_campaign_id
meta_ad_set_id
meta_ad_id
```

Store unknown/custom Meta fields safely in JSON/JSONB.

Preserve the original Meta payload for debugging and auditing where appropriate, but do not expose sensitive raw data unnecessarily.

The normalized lead must contain enough information for assignment rules to evaluate:

- Page
- Form
- Campaign
- Ad set
- Ad
- Source
- Custom fields

---

# 18. DUPLICATE DETECTION

Implement duplicate protection.

Primary duplicate key:

```text
meta_lead_id
```

For leads from other sources, use a safe duplicate strategy based on combinations such as:

```text
email
phone
organization_id
```

Do not accidentally merge different people.

If a possible duplicate is detected:

- Avoid creating an accidental duplicate
- Return a clear response
- Record the event
- Do not create a second assignment
- Do not send a duplicate assignment notification
- Allow future manual merge functionality

---

# 19. AUTOMATIC ASSIGNMENT WORKFLOW

When a new Meta lead is created, execute this workflow:

```text
New Meta Lead
      ↓
Determine organization
      ↓
Determine matching assignment rule
      ↓
Determine target sales team
      ↓
Load eligible team members
      ↓
Exclude inactive users
      ↓
Exclude paused users
      ↓
Exclude users at capacity if enabled
      ↓
Apply assignment strategy
      ↓
Lock assignment state
      ↓
Assign lead
      ↓
Create assignment record
      ↓
Create assignment history
      ↓
Create lead activity
      ↓
Update salesperson workload
      ↓
Notify salesperson
```

The assignment must happen automatically without requiring a manager to manually assign every Meta lead.

If automatic assignment is disabled:

- Create the lead as unassigned
- Notify managers if configured
- Display it in the unassigned queue

If no eligible salesperson is available:

- Keep the lead unassigned
- Set assignment status to `UNASSIGNED` or `REASSIGNMENT_REQUIRED`
- Create an assignment failure activity
- Notify sales managers/admins
- Make the lead visible in the unassigned queue
- Do not silently discard the lead

---

# 20. ASSIGNMENT STRATEGY IMPLEMENTATION

Implement each strategy as a separate, testable module.

## Round Robin

Use persistent database state.

The operation must be transaction-safe.

Example:

```text
Current pointer: Sarah
New lead → Sarah
Pointer advances to Michael
```

If Sarah becomes unavailable, skip her and assign to the next eligible user.

## Least Assigned

Calculate active workload using defined statuses.

Document which statuses count as active.

Recommended active statuses:

```text
NEW
ASSIGNED
CONTACTED
QUALIFIED
PROPOSAL
```

Do not count:

```text
WON
LOST
```

unless configured otherwise.

## Weighted Round Robin

Use persistent state and configured weights.

Validate that weights are positive integers.

## Manual Assignment

Manual assignment must:

- Verify the acting user's permission
- Verify the target user belongs to the same organization
- Verify the target user is eligible unless override is explicitly allowed
- Create assignment history
- Create an activity
- Create an audit log
- Notify the new assignee
- Optionally notify the previous assignee

---

# 21. SALES PIPELINE

Implement configurable sales statuses.

Default statuses:

```text
NEW
ASSIGNED
CONTACTED
QUALIFIED
PROPOSAL
WON
LOST
```

Every status transition must create an activity record.

Example:

```text
NEW → ASSIGNED
```

creates:

```text
activity:
STATUS_CHANGED

metadata:
{
  "oldStatus": "NEW",
  "newStatus": "ASSIGNED",
  "assignmentMethod": "ROUND_ROBIN"
}
```

Update timestamps automatically:

- contacted\_at
- qualified\_at
- proposal\_at
- won\_at
- lost\_at

Support configurable lost reasons.

---

# 22. LEAD ASSIGNMENT API

Create APIs for automatic and manual assignment.

At minimum:

```text
POST /api/leads/:id/assign
POST /api/leads/:id/reassign
GET  /api/leads/:id/assignment-history
GET  /api/leads/unassigned
```

Assignment request fields may include:

```json
{
  "userId": "user-id",
  "teamId": "team-id",
  "reason": "Manager reassignment"
}
```

Only authorized users may manually assign or reassign leads.

Sales representatives must not reassign leads unless explicitly permitted.

---

# 23. SALES TEAM AND ASSIGNMENT APIs

Create APIs such as:

```text
GET    /api/sales-teams
POST   /api/sales-teams
GET    /api/sales-teams/:id
PATCH  /api/sales-teams/:id
DELETE /api/sales-teams/:id

POST   /api/sales-teams/:id/members
DELETE /api/sales-teams/:id/members/:userId
PATCH  /api/sales-teams/:id/members/:userId

GET    /api/assignment/settings
PATCH  /api/assignment/settings

GET    /api/assignment/rules
POST   /api/assignment/rules
GET    /api/assignment/rules/:id
PATCH  /api/assignment/rules/:id
DELETE /api/assignment/rules/:id

GET    /api/assignment/workload
GET    /api/assignment/unassigned
POST   /api/assignment/retry/:leadId
```

---

# 24. FOLLOW-UPS

Implement follow-up management.

Support:

```text
Task
Follow-up date
Reminder
Assigned user
Completed status
Priority
```

When a lead is automatically assigned, optionally create a default follow-up task according to organization settings.

Example:

```text
New Meta Lead
 ↓
Assigned to Sarah
 ↓
Create task: Contact new lead
 ↓
Due in 15 minutes
 ↓
Notify Sarah
```

Make the default follow-up behavior configurable.

Support overdue task detection.

---

# 25. NOTIFICATIONS

Implement an internal notification system.

Support events such as:

- New Meta lead
- Lead automatically assigned
- Lead manually assigned
- Lead reassigned
- Lead assignment failed
- Lead placed in unassigned queue
- Follow-up due
- Follow-up overdue
- Lead qualified
- Deal won
- Deal lost
- Meta synchronization failure
- Meta connection failure
- Salesperson reached capacity
- No eligible salesperson available

For automatic assignment, the assigned salesperson notification should include:

- Lead name
- Lead source
- Assignment time
- Assigned team
- Campaign/form if available
- Link to the lead profile
- Follow-up due time if a task was created

Keep notification delivery abstract so future channels can be added.

---

# 26. SALES ANALYTICS API

Build backend analytics endpoints.

Metrics should include:

## Lead metrics

- Total leads
- New leads
- Leads by source
- Leads by status
- Leads by salesperson
- Leads by team
- Leads over time
- Assigned leads
- Unassigned leads
- Assignment failure count
- Average time from import to assignment

## Assignment metrics

- Leads assigned per salesperson
- Leads assigned per team
- Leads assigned by strategy
- Round-robin distribution
- Average assignment time
- Unassigned lead count
- Assignment failure rate
- Current salesperson workload
- Capacity utilization
- Reassignment count
- Leads assigned outside normal rules

## Conversion

```text
Lead → Contacted
Lead → Qualified
Lead → Proposal
Lead → Won
```

Calculate conversion rates by:

- Salesperson
- Team
- Source
- Campaign
- Form
- Assignment strategy

## Revenue

- Total deal value
- Won revenue
- Average deal value
- Revenue by salesperson
- Revenue by team
- Revenue by source
- Revenue by campaign
- Revenue by month

## Meta performance

Where data is available:

```text
Meta Leads
Campaign
Ad Set
Ad
Form
Qualified leads
Won leads
Revenue
```

Do not invent Meta metrics that the API does not provide.

---

# 27. API DESIGN

Create clean REST APIs.

At minimum support:

```text
GET    /api/leads
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
DELETE /api/leads/:id

POST   /api/leads/:id/assign
POST   /api/leads/:id/reassign
GET    /api/leads/:id/assignment-history
POST   /api/leads/:id/status
POST   /api/leads/:id/notes
GET    /api/leads/:id/activities
POST   /api/leads/:id/tags

GET    /api/leads/unassigned

GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
POST   /api/tasks/:id/complete

GET    /api/deals
POST   /api/deals
GET    /api/deals/:id
PATCH  /api/deals/:id

GET    /api/sales/analytics
GET    /api/sales/analytics/assignments
GET    /api/sales/workload

GET    /api/notifications
POST   /api/notifications/:id/read
POST   /api/notifications/read-all

GET    /api/sales-teams
POST   /api/sales-teams
GET    /api/sales-teams/:id
PATCH  /api/sales-teams/:id
DELETE /api/sales-teams/:id

GET    /api/assignment/settings
PATCH  /api/assignment/settings

GET    /api/assignment/rules
POST   /api/assignment/rules
PATCH  /api/assignment/rules/:id
DELETE /api/assignment/rules/:id

GET    /api/integrations/meta/status
GET    /api/integrations/meta/connect
GET    /api/integrations/meta/callback
POST   /api/integrations/meta/sync
POST   /api/integrations/meta/disconnect

GET    /api/webhooks/meta
POST   /api/webhooks/meta
```

Use pagination, filtering, sorting, and search for lead/task/deal endpoints.

Support lead filters for:

- Assigned user
- Assigned team
- Assignment status
- Source
- Status
- Priority
- Campaign
- Form
- Date range
- Unassigned state

---

# 28. VALIDATION

Use Zod for backend and frontend validation.

Validate:

- Lead creation
- Lead updates
- Status changes
- Assignment
- Reassignment
- Sales team creation
- Sales team membership
- Assignment settings
- Assignment rules
- Tasks
- Deals
- Meta configuration
- Webhook payloads
- Query parameters
- Authentication inputs
- Organization inputs

Validate assignment rules carefully.

Prevent invalid configurations such as:

- Assignment rule without a team
- Negative assignment weight
- Invalid strategy
- Inactive team as default team
- User from another organization
- Duplicate team membership
- Invalid capacity
- Invalid Meta IDs

Never trust frontend validation.

Backend validation is mandatory.

---

# 29. ERROR HANDLING

Implement proper errors for:

```text
Meta OAuth failure
Invalid token
Expired token
Insufficient permissions
Webhook verification failure
Meta API failure
Rate limit
Duplicate lead
Database failure
Invalid request
Unauthorized access
Forbidden access
Missing organization
No eligible salesperson
Sales team unavailable
Assignment capacity reached
Assignment state conflict
Invalid assignment rule
```

Use consistent API error responses.

Do not expose:

- Meta App Secret
- Access tokens
- Encryption keys
- Internal stack traces
- Database credentials
- Sensitive raw payloads

to the client.

---

# 30. META RATE LIMITING AND RETRIES

Meta API calls must not retry forever.

Implement:

- Exponential backoff
- Bounded retries
- Rate-limit handling
- Structured logging
- Timeout handling
- Token refresh/reconnection handling where applicable

Webhook processing should not block unnecessarily.

If a queue is needed, use a production-ready approach compatible with the deployment environment.

For example:

```text
Meta Webhook
      ↓
Queue or Background Job
      ↓
Meta Lead Worker
      ↓
Graph API
      ↓
Database
      ↓
Assignment Engine
      ↓
Notification
```

The assignment engine must run after the lead is safely created or updated.

---

# 31. LOGGING AND AUDIT

Create structured logs for:

```text
Meta OAuth
Meta API calls
Webhook events
Lead imports
Lead updates
Assignment decisions
Assignment rule matches
Assignment failures
Assignment state changes
Assignment changes
Status changes
Sync failures
Authentication events
Authorization failures
```

Do not log secrets or access tokens.

Create audit records for important sales and assignment actions.

Audit metadata should include:

- Assignment method
- Assignment strategy
- Assignment rule
- Selected team
- Selected salesperson
- Eligible salesperson list where appropriate
- Reason for excluding users
- Fallback behavior
- Assignment failure reason

Do not store unnecessary sensitive information.

---

# 32. CRON / BACKUP SYNCHRONIZATION

Webhooks should be the primary real-time mechanism.

Also implement a backup synchronization mechanism.

For example:

```text
Every 15–30 minutes
       ↓
Check connected Meta forms
       ↓
Fetch recent leads
       ↓
Deduplicate
       ↓
Insert missing leads
       ↓
Run assignment engine
       ↓
Notify assigned salespeople
```

Make the interval configurable.

Use a secure cron endpoint or deployment-compatible scheduled job.

Protect cron endpoints with `CRON_SECRET`.

The backup sync must also be idempotent and concurrency-safe.

---

# 33. FRONTEND DESIGN AND STITCH IMPLEMENTATION

The frontend must be fully implemented using the Stitch project design instructions below.

Do not create empty frontend shells.

Use the Stitch screens as the visual and interaction reference, make every box and text and number and anlysis interactive and clickable

## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project
Title: Vivid Sales CRM Dashboard
ID: 7477153002428812743

## Screens:
1. Win/Loss Analytics Dashboard
    ID: 6309cc6d3cd74a9690546c77d2d3ac89

2. Lead Profile - Alexander Thorne
    ID: 412fe4728a994ee087b0e35d7cefdf48

3. Deals Pipeline Board
    ID: 8f3bd4fee6074a06a8917f0b25655d1f

4. Design System
    ID: asset-stub-assets_18793664dfbc4830b06b97de40f085bc

5. Sales Dashboard Home
    ID: b3daf6917562447781a93fa3c896f4d9

6. Leads Management
    ID: d3e566d72c6c48fca2130f89cf1e1e2b

7. Shader
    ID: e4d7a47e5dad4de5919160b0656e98a9

Use a utility like `curl -L` to download the hosted URLs.

to download hosted images, assets, or code URLs when available.

If Stitch provides hosted URLs, retrieve the assets and inspect the generated code before implementing the frontend.

Do not merely approximate the screens.

Recreate the visual language, layout, spacing, typography, colors, navigation, cards, tables, charts, pipeline columns, filters, and responsive behavior shown in the Stitch project.

Extend the Stitch design to include automatic lead distribution functionality.

---

# 34. REQUIRED FRONTEND ROUTES

Implement these routes:

```text
/sales
/sales/leads
/sales/leads/[id]
/sales/tasks
/sales/deals
/sales/analytics
/sales/unassigned
/sales/team
/sales/assignment
/settings/integrations/meta
```

Map the Stitch screens as follows:

```text
/sales
    Sales Dashboard Home

/sales/leads
    Leads Management

/sales/leads/[id]
    Lead Profile - Alexander Thorne as the reference detail layout

/sales/deals
    Deals Pipeline Board

/sales/analytics
    Win/Loss Analytics Dashboard

/sales/unassigned
    Unassigned leads queue using the same Vivid Sales CRM visual language

/sales/team
    Sales team workload and assignment performance

/sales/assignment
    Assignment rules, strategies, capacity, and distribution settings

/settings/integrations/meta
    Meta integration settings page using the same Vivid Sales CRM visual language
```

---

# 35. FRONTEND FUNCTIONALITY

The frontend must be connected to the real backend APIs.

Implement:

- Lead search
- Lead filtering
- Lead sorting
- Lead pagination
- Lead creation
- Lead editing
- Lead assignment
- Lead reassignment
- Lead status changes
- Lead notes
- Lead activities
- Lead tags
- Assignment history
- Unassigned lead queue
- Assignment failure indicators
- Sales team management
- Salesperson workload display
- Capacity display
- Pause/resume assignment eligibility
- Assignment strategy configuration
- Assignment rule creation and editing
- Task creation
- Task completion
- Deal creation
- Deal updates
- Pipeline drag-and-drop if appropriate
- Analytics filters
- Date range filters
- Assignment analytics
- Meta connection status
- Meta connect/disconnect actions
- Manual Meta synchronization
- Synchronization results
- Notifications
- Loading states
- Empty states
- Error states
- Toast notifications
- Responsive layouts

Do not use hardcoded fake data in production screens.

Use loading skeletons only where appropriate.

---

# 36. FRONTEND ASSIGNMENT EXPERIENCE

The frontend must make automatic distribution visible and understandable.

On the lead list, display:

- Assigned salesperson
- Assigned team
- Assignment status
- Assignment method
- Assignment time
- Source
- Campaign/form where available

On the lead profile, display:

- Current assignee
- Current team
- Assignment method
- Assignment rule
- Assignment history
- Previous assignees
- Assignment failure reason if applicable
- Manual reassignment controls for authorized users

On the unassigned page, display:

- Lead name
- Source
- Time waiting for assignment
- Assignment failure reason
- Matching rule if available
- Available salespeople
- Manual assignment action
- Retry assignment action

On the team page, display:

- Salesperson
- Active/inactive status
- Paused status
- Current active leads
- Capacity
- Capacity utilization
- Last assigned time
- Total assigned leads
- Conversion performance
- Assignment eligibility

On the assignment settings page, display:

- Automatic assignment toggle
- Default strategy
- Default team
- Capacity enforcement
- Notification settings
- Fallback behavior
- Assignment rules
- Rule priority
- Meta page/form routing

---

# 37. FRONTEND API LAYER

Create typed API utilities and hooks:

```text
src/lib/api/leads.ts
src/lib/api/meta.ts
src/lib/api/tasks.ts
src/lib/api/deals.ts
src/lib/api/analytics.ts
src/lib/api/notifications.ts
src/lib/api/sales-teams.ts
src/lib/api/assignment.ts
```

Create types:

```text
src/types/lead.ts
src/types/meta.ts
src/types/deal.ts
src/types/task.ts
src/types/sales.ts
src/types/notification.ts
src/types/assignment.ts
src/types/sales-team.ts
```

Use TanStack Query for:

- Queries
- Mutations
- Cache invalidation
- Optimistic updates where safe
- Error handling
- Assignment status refresh
- Workload refresh
- Notification refresh

---

# 38. FRONTEND COMPONENT ARCHITECTURE

Create reusable components based on the Stitch design:

```text
src/components/sales/
  SalesLayout.tsx
  SalesSidebar.tsx
  SalesHeader.tsx
  MetricCard.tsx
  LeadTable.tsx
  LeadFilters.tsx
  LeadStatusBadge.tsx
  LeadAssignmentBadge.tsx
  LeadProfile.tsx
  LeadActivityTimeline.tsx
  LeadNotes.tsx
  LeadAssignment.tsx
  AssignmentHistory.tsx
  UnassignedLeadQueue.tsx
  AssignmentFailureAlert.tsx
  PipelineBoard.tsx
  PipelineColumn.tsx
  DealCard.tsx
  AnalyticsCharts.tsx
  WinLossChart.tsx
  RevenueChart.tsx
  SourceBreakdown.tsx
  AssignmentAnalytics.tsx
  SalesTeamTable.tsx
  SalespersonWorkload.tsx
  CapacityIndicator.tsx
  AssignmentSettings.tsx
  AssignmentRuleList.tsx
  AssignmentRuleForm.tsx
  TaskList.tsx
  NotificationCenter.tsx
  MetaIntegrationCard.tsx
  MetaSyncStatus.tsx
```

Use reusable components rather than duplicating page-specific markup.

---

# 39. FRONTEND VISUAL REQUIREMENTS

Follow the Stitch design closely.

Preserve:

- Overall layout
- Sidebar structure
- Header structure
- Navigation hierarchy
- Typography scale
- Color palette
- Border radius
- Shadows
- Table styling
- Card styling
- Chart styling
- Pipeline board styling
- Status colors
- Spacing system
- Responsive behavior
- Empty states
- Modal and drawer behavior

Use accessible semantic HTML.

Ensure:

- Keyboard navigation
- Visible focus states
- Proper labels
- Accessible dialogs
- Accessible tables
- Accessible charts where possible
- Sufficient color contrast

Add clear visual distinctions for:

- Assigned leads
- Unassigned leads
- Assignment failures
- Automatically assigned leads
- Manually assigned leads
- Paused salespeople
- Salespeople at capacity
- Available salespeople

---

# 40. RESPONSIVE DESIGN

The frontend must work on:

- Desktop
- Laptop
- Tablet
- Mobile

For mobile:

- Collapse sidebar
- Use responsive tables or cards
- Make pipeline columns horizontally scrollable or stack appropriately
- Keep filters usable
- Preserve important actions
- Avoid horizontal overflow except where intentional

The assignment interface must remain usable on mobile.

Managers must be able to:

- View unassigned leads
- Assign leads
- Reassign leads
- View salesperson workload

from smaller screens.

---

# 41. DOCUMENTATION

Create:

```text
docs/sales-system.md
docs/meta-integration.md
docs/meta-setup.md
docs/api.md
docs/frontend.md
docs/neon-setup.md
docs/lead-distribution.md
```

Document:

## Neon setup

Explain:

1. Create a Neon project.
2. Create the database.
3. Configure `DATABASE_URL`.
4. Configure `DIRECT_URL` if required.
5. Run migrations.
6. Run seed scripts.
7. Verify database connectivity.

## Meta setup

Explain:

1. Create Meta Developer App.
2. Configure OAuth.
3. Configure redirect URI.
4. Configure webhook.
5. Configure required permissions.
6. Add environment variables.
7. Connect Meta from the application.
8. Select pages/forms.
9. Configure assignment routing.
10. Test locally.
11. Submit for Meta review if required.
12. Move to production.

## Lead distribution

Document:

- How automatic assignment works
- Supported assignment strategies
- How round robin state is stored
- How capacity limits work
- How to configure sales teams
- How to configure assignment rules
- How unassigned leads are handled
- How to manually reassign leads
- How to retry failed assignments
- How notifications work
- How historical imports are assigned

## Frontend

Document:

- Route structure
- Component structure
- API hooks
- Design system
- Stitch asset usage
- How to extend the dashboard
- How to add new assignment strategies

---

# 42. LOCAL DEVELOPMENT

Provide:

```text
.env.example
```

Include all required variables.

Document:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Adapt commands to the selected package manager.

The seed script must create:

- An example organization
- An admin user
- A sales manager
- Multiple sales representatives
- A sales team
- Assignment settings
- A default round-robin configuration
- Example assignment rules if appropriate

Do not use seeded fake leads in the final production UI unless explicitly enabled for development.

Make Meta webhook testing easy locally.

Document how to expose the webhook endpoint using a secure tunneling solution if required:

```text
localhost
   ↓
secure tunnel
   ↓
public HTTPS URL
   ↓
Meta Webhook
```

Do not hardcode a tunnel provider into the architecture.

---

# 43. TESTING

Write automated tests for critical functionality.

## Authentication tests

- Registration
- Login
- Logout
- Protected routes
- Invalid credentials
- Role restrictions

## Lead tests

- Create lead
- Update lead
- Duplicate protection
- Status transition
- Assignment
- Reassignment
- Activities
- Notes
- Tags
- Unassigned queue

## Assignment tests

- Round-robin assignment
- Persistent round-robin state
- Concurrent assignment safety
- Least-assigned strategy
- Weighted round-robin strategy
- Capacity enforcement
- Paused salesperson exclusion
- Inactive salesperson exclusion
- No eligible salesperson
- Assignment rule priority
- Meta form routing
- Meta page routing
- Manual assignment authorization
- Reassignment history
- Assignment notification
- Duplicate assignment prevention
- Retry failed assignment

## Meta tests

- OAuth callback
- Invalid OAuth state
- Webhook verification
- Webhook payload processing
- Duplicate webhook
- Meta lead normalization
- API failure
- Token failure
- Historical synchronization
- Historical synchronization assignment

## Security tests

- Unauthorized access
- Cross-tenant access
- Role restrictions
- Secret exposure prevention
- Cross-organization assignment prevention
- Unauthorized reassignment prevention

## Analytics tests

- Correct lead counts
- Correct conversion rates
- Correct revenue calculations
- Correct filtering
- Correct assignment metrics
- Correct workload calculations
- Correct capacity calculations

## Frontend tests

- Lead table rendering
- Lead filtering
- Assignment status rendering
- Status update
- Assignment flow
- Reassignment flow
- Unassigned queue rendering
- Sales team workload rendering
- Assignment settings rendering
- Pipeline rendering
- Analytics rendering
- Loading states
- Error states

Do not test only happy paths.

---

# 44. SECURITY REQUIREMENTS

Implement:

- CSRF/state protection for OAuth
- Secure token storage
- Server-side authorization
- Input validation
- Webhook verification
- Rate limiting where appropriate
- No secrets in frontend
- No secrets in logs
- Tenant isolation
- Safe database queries
- Secure password hashing
- Secure session handling
- Proper error handling
- Secure cron authentication
- Concurrency-safe assignment transactions
- Organization-scoped assignment rules
- Organization-scoped sales teams
- Organization-scoped user validation
- Protection against unauthorized lead reassignment

---

# 45. DO NOT MOCK PRODUCTION FUNCTIONALITY

Do not create fake Meta data and call the integration complete.

If Meta credentials are unavailable during development:

Create a clean abstraction:

```text
MetaProvider
```

with:

```text
getPages()
getForms()
getLeads()
getCampaigns()
getAds()
subscribeWebhooks()
```

The real implementation must use the Meta Graph API.

Mock providers may exist only for automated tests.

Do not use fake lead data in the final production UI.

The assignment engine must be tested with fixtures, but production assignment must use real database users and real sales teams.

---

# 46. CODE QUALITY

Prefer:

- Small services
- Clear modules
- Typed APIs
- Reusable functions
- Strong validation
- Proper error classes
- Dependency injection where useful
- No duplicated Meta logic
- No giant files
- No unnecessary abstractions
- Clear database repositories
- Clear service boundaries
- Consistent naming
- Consistent error responses
- Transaction-safe assignment logic
- Deterministic assignment behavior
- Explicit assignment auditability

Keep Meta-specific code isolated.

Keep assignment-specific code isolated.

Keep frontend components separate from backend business logic.

---

# 47. IMPLEMENTATION PROCESS

Work in phases.

## Phase 1

Create the project from scratch.

Set up:

- Next.js
- TypeScript
- Tailwind
- Authentication
- Prisma or Drizzle
- Neon connection
- Environment configuration
- Linting
- Formatting
- Testing

## Phase 2

Create the database schema and migrations.

Include:

- Organizations
- Users
- Sales teams
- Sales team members
- Assignment settings
- Assignment rules
- Assignment state
- Leads
- Lead assignments
- Assignment history
- Activities
- Notes
- Tasks
- Deals
- Notifications
- Audit logs
- Meta integration models

## Phase 3

Create authentication, organizations, users, roles, and sales teams.

## Phase 4

Create assignment settings, assignment rules, and assignment strategies.

## Phase 5

Create sales backend/API.

## Phase 6

Create Meta OAuth.

## Phase 7

Create Meta Graph API integration.

## Phase 8

Create historical synchronization.

## Phase 9

Create webhooks.

## Phase 10

Connect Meta lead ingestion to the assignment engine.

## Phase 11

Create tasks, notifications, and automation.

## Phase 12

Create analytics.

## Phase 13

Retrieve and inspect Stitch assets and generated code.

Use `curl -L` for hosted URLs when available.

## Phase 14

Implement the frontend according to the Stitch screens.

## Phase 15

Implement unassigned leads, sales team workload, and assignment settings screens.

## Phase 16

Connect frontend to real APIs.

## Phase 17

Write tests.

## Phase 18

Write documentation.

## Phase 19

Run a complete security, concurrency, assignment, and production-readiness review.

---

# 48. FINAL REPORT

When finished, report:

## Built

- New application from scratch
- Neon PostgreSQL database
- Authentication
- Organizations and multi-tenancy
- RBAC
- Sales CRM
- Lead management
- Meta lead ingestion
- Meta OAuth
- Meta Pages
- Meta Forms
- Meta historical synchronization
- Meta Webhooks
- Duplicate protection
- Automatic lead distribution
- Round-robin assignment
- Least-assigned strategy
- Weighted assignment if implemented
- Sales teams
- Salesperson capacity
- Assignment rules
- Assignment history
- Unassigned lead queue
- Manual assignment and reassignment
- Tasks
- Deals
- Activities
- Notes
- Tags
- Notifications
- Analytics
- Frontend based on Stitch screens
- Responsive design
- Tests
- Documentation

## Database changes

List every model/table/migration added.

## API endpoints

List every endpoint.

## Assignment behavior

Explain:

- Default assignment strategy
- How eligible salespeople are selected
- How capacity is enforced
- How round-robin state is stored
- How assignment rules are prioritized
- How unassigned leads are handled
- How managers are notified
- How manual reassignment works
- How duplicate assignments are prevented

## Environment variables

List every required variable.

## Meta Developer setup

Tell me exactly what still needs to be configured inside Meta.

## Neon setup

Tell me exactly what still needs to be configured in Neon.

## Stitch implementation

List:

- Downloaded assets
- Implemented screens
- Reusable components
- Routes
- Any Stitch limitations or unavailable assets

## Remaining manual steps

Only list things that cannot be automated from the codebase, such as:

- Meta Developer App creation
- Meta credentials
- Meta permissions/review
- Production webhook URL
- Production environment variables
- Neon project creation
- Deployment configuration
- Adding real sales team members
- Configuring production assignment rules

---

# MOST IMPORTANT RULES

1. Build the application from scratch.
2. Use Neon PostgreSQL.
3. Use a production-ready ORM.
4. Implement real authentication and authorization.
5. Implement real multi-tenancy.
6. Build the real backend and Meta integration.
7. Pull real leads from Meta.
8. Automatically distribute every eligible Meta lead to a sales team member.
9. Use a transaction-safe assignment engine.
10. Support round-robin assignment at minimum.
11. Support unassigned fallback behavior.
12. Notify the assigned salesperson.
13. Do not create duplicate leads or duplicate assignments.
14. Do not fake Meta functionality.
15. Do not expose secrets.
16. Implement the Stitch frontend screens.
17. Use `curl -L` to retrieve hosted Stitch assets when available.
18. Connect the frontend to real APIs.
19. Do not use hardcoded fake production data.
20. Test critical functionality.
21. Test concurrent assignment behavior.
22. Document all setup steps.
23. Keep Meta integration modular.
24. Keep assignment logic modular.
25. Keep frontend and backend concerns separated.
26. Start by creating the project architecture and implementation plan.
27. Do not skip security, validation, authorization, tenant isolation, or assignment failure handling.
28. Never silently leave a Meta lead unprocessed.
29. If a lead cannot be assigned, place it in the unassigned queue and notify the appropriate managers.
30. The core business requirement is: Meta leads must be pulled into the CRM and automatically distributed to the sales team.
