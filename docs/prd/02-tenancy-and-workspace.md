# 02 — Multi-Tenancy, Organization & Workspace

## 2.1 Tenancy Model
- **Tenant = Organization (Agency).** Hard isolation boundary.
- Shared database, shared schema, **row-level tenancy**: every tenant-owned table has a non-null `organization_id` (UUID, FK, indexed — usually first column of composite indexes).
- **Defense in depth:**
  1. **Application layer:** a Prisma client extension auto-injects `organization_id` filters/values from the request context (`TenantContext`, resolved from session + domain). Repositories cannot run unscoped queries.
  2. **Database layer:** PostgreSQL **Row-Level Security (RLS)** on every tenant table; the app sets `SET LOCAL app.current_org_id = '<uuid>'` per transaction. App DB role has no `BYPASSRLS`.
  3. **Cache layer:** all Redis keys prefixed with `org:{orgId}:`.
  4. **Storage layer:** object keys prefixed with `orgs/{orgId}/`; signed URLs only.
  5. **Search/analytics/queues:** every document, job payload, and event carries `organizationId`.
- **Platform-level tables** (no `organization_id`): `users` (global identity), `plans`, `permissions` catalog, platform feature flags.
- **Forbidden:** any query on a tenant table without tenant scoping. CI includes tests asserting RLS blocks cross-tenant reads.
- **Enterprise option (Phase 5):** dedicated database/infrastructure per tenant via the same code path (tenant → connection routing).

## 2.2 Organization (Agency Profile)
| Field | Notes |
|---|---|
| Name, legal name, slug | Slug unique platform-wide; used for `slug.app-domain` |
| Logo, favicon, brand colors | Used for internal app + portal + emails |
| Industry focus, size | Onboarding & analytics |
| Default timezone, locale, currency, week start, date format | Per-org defaults; users can override timezone/locale |
| Tax details | GSTIN/VAT, PAN, registered address (for invoices) |
| Status | `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED` |
| Data region | For future data residency |

### Org lifecycle
Sign up → create org (owner = creator) → onboarding wizard (branding, invite team, add first client, connect first social account) → trial → subscription.
Deletion: soft delete with configurable grace period → hard delete + export package → audit retained per policy.

## 2.3 Workspaces
- An org can have **multiple workspaces** (e.g. by office, business unit, or client tier).
- Clients, projects, and teams belong to exactly one workspace; users can be members of many.
- Workspace-level settings override org defaults (workflows, templates, notification defaults, branding for portal).
- Plan limits on workspace count are configurable.

## 2.4 Departments & Designations (fully customizable)
- **Departments are a tree** (unlimited nesting, configurable max depth): e.g. `Creative → Design → Motion`, `Accounts → Key Accounts`.
- Implemented with adjacency list + materialized path (`ltree` or path string) for O(depth) ancestor/descendant queries.
- **Each department defines its own designations** (e.g. Design: Junior Designer, Senior Designer, Art Director).
- **A member can hold multiple designations across multiple departments** (`member_designations` join table with optional `is_primary`).
- Department and designation can be used as **permission scopes** and in workflow/automation conditions ("assign to any `Senior Designer` in `Design`").
- Department heads (designation flag `is_head`) can be used for approval routing.

## 2.5 Teams
- Cross-functional groups (e.g. "Team Nike", "Reels Squad").
- **Members can belong to multiple teams** with a team role (`LEAD`, `MEMBER`).
- Teams can be assigned to clients/projects; team membership can grant scope (see [03](03-identity-and-access-control.md)).
- Team capacity aggregates member capacity (see [14](14-finance-and-operations.md)).

## 2.6 Locations
- Offices/remote hubs with address, timezone, holiday calendar, working hours.
- Members linked to a location → drives availability, holidays, quiet hours defaults.

## 2.7 Branding & White-Label
| Capability | Plan |
|---|---|
| Logo, colors in app & portal | All |
| Branded email sender name | Growth+ |
| Custom email sending domain (SPF/DKIM verified) | Growth+ |
| Custom portal domain (`clients.agency.com`) | Growth+ |
| Full white-label (custom app domain, remove platform branding, custom favicon, custom login page) | Enterprise |

### Custom Domains
- Agency adds domain → platform shows DNS records (CNAME + TXT verification) → verification job → automatic TLS (ACME) → domain active.
- Domain → tenant resolution at the edge (middleware) with cached lookup (`domain:{host}` → orgId, configurable TTL, invalidated on change).
- Status: `PENDING_VERIFICATION`, `VERIFIED`, `TLS_PROVISIONING`, `ACTIVE`, `FAILED`.

## 2.8 Workspace Settings (configurable surface)
- General: name, timezone, locale, currency, working days/hours.
- Workflows: content pipeline states, task states (see [07](07-projects-tasks-and-workflow-states.md)).
- Custom fields, forms, templates (see [17](17-platform-features.md)).
- Roles & permissions (see [03](03-identity-and-access-control.md)).
- Notification defaults (see [15](15-notifications.md)).
- Integrations & social accounts.
- Security: SSO, MFA enforcement, session timeout, IP allowlist (Enterprise), password policy.
- Data: export, retention, audit log access.

## 2.9 Data Ownership (tenancy module)
`organizations`, `workspaces`, `departments`, `designations`, `member_designations`, `teams`, `team_members`, `locations`, `organization_branding`, `custom_domains`, `organization_settings`.

## 2.10 Events Emitted
`organization.created`, `organization.updated`, `organization.suspended`, `workspace.created`, `department.created/updated/deleted`, `team.member_added/removed`, `custom_domain.verified/failed`, `branding.updated`.

## 2.11 Acceptance Criteria
- A user from Org A can never read, write, search, or receive notifications/events for Org B data — verified by automated RLS and API tests.
- Department tree supports ≥ 10 levels; moving a subtree updates paths in one transaction.
- A member with 3 designations in 2 departments appears correctly in assignment pickers filtered by either.
- Custom domain goes from added → active automatically after DNS is correct, without support intervention.
