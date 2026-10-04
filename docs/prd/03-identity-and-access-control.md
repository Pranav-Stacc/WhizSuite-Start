# 03 — Identity, Invitations & Access Control

## 3.1 Identity & Authentication
- **Global user identity** (`users`): one account (email) can belong to multiple organizations via `organization_memberships`. Org switcher in UI.
- **Login methods:** email + password, magic link, Google, Microsoft; SAML/OIDC SSO (Enterprise); passkeys (Phase 4).
- **MFA:** TOTP + backup codes; org can enforce MFA for all or specific roles.
- **Sessions:** short-lived JWT access token + rotating refresh token in httpOnly Secure cookies; refresh reuse detection revokes the session family. Session list + "log out all devices".
- **Password policy, lockout thresholds, session lifetime** — configurable per org (within platform bounds).
- **Client users** authenticate through the same identity service but land in the **portal experience** (see [13](13-client-portal-and-white-label.md)); membership type distinguishes them.

## 3.2 Membership Types
| Type | Description | Default experience |
|---|---|---|
| `OWNER` | Created the org; billing owner; at least one required | Internal app |
| `EMPLOYEE` | Internal staff | Internal app |
| `CONTRACTOR` | Freelancer/contractor; time-bound optional | Internal app (restricted) |
| `EXTERNAL_COLLABORATOR` | Partner agency, consultant | Internal app (restricted, project-scoped) |
| `CLIENT_USER` | Client-side approver/viewer | Client portal only |

Memberships have `status` (`INVITED`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`) and optional `expires_at` (auto-deactivation job).

## 3.3 Invitations
```
Admin → Invite (email, membership type, role(s), scope(s), teams, departments/designations, clients)
   → Email (branded, expiring signed token)
   → Accept → Create account or log in → Membership created → Roles + scopes applied → Welcome flow
```
- Bulk invite (CSV) and invite links (with domain restriction, max uses, expiry).
- Invitation states: `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`. Resend & revoke.
- Expiry, max pending invites, and allowed email domains are configurable.
- Seat-limit check against subscription entitlements before sending.
- Events: `invitation.sent`, `invitation.accepted`, `invitation.expired`, `member.joined`.

## 3.4 Authorization Engine (RBAC + Scopes + Conditions)
Not simple roles. Model:
```
User → Membership → Organization → Role Assignment → Role → Permissions
                                        └── Scope (type + resource id) + Conditions
```

### 3.4.1 Permissions
Fine-grained, `resource.action` strings from a **platform permission catalog** (versioned in code/seed; agencies cannot invent new permission keys, but compose roles from them).

| Domain | Permissions |
|---|---|
| Organization | `org.view`, `org.settings.manage`, `org.billing.manage`, `org.branding.manage`, `org.domains.manage` |
| Members | `members.view`, `members.invite`, `members.edit`, `members.deactivate`, `roles.manage` |
| Workspaces | `workspaces.view`, `workspaces.create`, `workspaces.manage` |
| Clients | `clients.view`, `clients.create`, `clients.edit`, `clients.delete`, `clients.financials.view` |
| CRM | `leads.view`, `leads.create`, `leads.edit`, `leads.convert`, `leads.delete` |
| Projects | `projects.view`, `projects.create`, `projects.edit`, `projects.delete`, `projects.archive` |
| Tasks | `tasks.view`, `tasks.create`, `tasks.assign`, `tasks.edit`, `tasks.delete`, `tasks.transition` |
| Content | `content.view`, `content.create`, `content.edit`, `content.delete` |
| Social | `social.accounts.view`, `social.accounts.connect`, `social.schedule`, `social.publish`, `social.analytics.view` |
| Inbox | `inbox.view`, `inbox.reply`, `inbox.assign`, `inbox.moderate` |
| Approvals | `approvals.view`, `approvals.create`, `approvals.approve`, `approvals.override` |
| Feedback | `feedback.view`, `feedback.create`, `feedback.resolve` |
| Files | `files.view`, `files.upload`, `files.download`, `files.delete`, `files.share` |
| Workflows | `workflows.view`, `workflows.manage` |
| Automations | `automations.view`, `automations.manage`, `automations.run` |
| Reports | `reports.view`, `reports.create`, `reports.share` |
| Finance | `proposals.*`, `contracts.*`, `invoices.view`, `invoices.create`, `invoices.send`, `payments.record` |
| Time | `time.track`, `time.view_all`, `time.approve` |
| Audit | `audit.view`, `audit.export` |
| Integrations | `integrations.view`, `integrations.manage`, `api_keys.manage` |

### 3.4.2 Scopes
| Scope | Meaning |
|---|---|
| `GLOBAL` | Platform staff only (support/superadmin; separate audited path) |
| `ORGANIZATION` | Everything in the org |
| `WORKSPACE` | Everything in a workspace |
| `DEPARTMENT` | Resources owned by/assigned to a department (optionally including descendants) |
| `TEAM` | Resources assigned to a team |
| `CLIENT` | Everything under specific client(s) |
| `PROJECT` | Specific project(s) |
| `TASK` / `CONTENT` | Specific item(s) |
| `SELF` | Only resources the user created or is assigned to |

Scope can be **static** (explicit resource IDs) or **dynamic** (e.g. "clients where I am the assigned Account Manager", "projects of teams I belong to").

### 3.4.3 Conditions (ABAC extensions)
Optional predicates on a grant, e.g. `content.status IN ('DRAFT','IN_REVIEW')`, `amount <= 50000`, `membership.type = EMPLOYEE`, time windows. Evaluated by a policy evaluator with a constrained, safe expression language (JSON rule tree, no code execution).

### 3.4.4 Evaluation
`can(user, permission, resource) → ALLOW | DENY (+ reason)`
1. Resolve membership in resource's org (deny if none / inactive).
2. Collect role assignments (direct + via teams/departments).
3. Filter grants containing `permission`.
4. Check scope containment: resource's ancestry (`org → workspace → client → project → task/content`) is precomputed and cached; containment check is O(1) set lookups.
5. Evaluate conditions.
6. Explicit **deny** grants override allows (for exceptions like "everyone except finance").

**List queries** compile the user's scopes into SQL predicates (`client_id IN (...)`, `project_id IN (...)`) — never fetch-then-filter.

**Caching:** effective permission set per `(org, user)` cached in Redis (`org:{orgId}:authz:user:{userId}:v{ver}`), invalidated on role/assignment/membership/team/scope changes via events. TTL configurable.

### 3.4.5 System Roles (seeded templates, editable/cloneable)
| Role | Default grants |
|---|---|
| Owner | All permissions @ ORGANIZATION (cannot be removed from last owner) |
| Admin | All except billing @ ORGANIZATION |
| Account Manager | Clients/projects/content/approvals/reports/inbox @ CLIENT (dynamic: assigned clients) |
| Social Media Manager | Content/social/calendar/analytics @ CLIENT or TEAM |
| Content Creator (Copy/Design/Video) | Tasks/content/files/feedback @ SELF + PROJECT |
| Community Manager | Inbox + social.view @ CLIENT |
| Finance | Finance + clients.financials.view @ ORGANIZATION |
| Contractor | Tasks/files @ TASK or PROJECT |
| Client Approver | Portal: content.view, approvals.approve, feedback.create, files.view @ CLIENT (own) |
| Client Viewer | Portal: view-only @ CLIENT (own) |

Agencies create custom roles from the catalog. Advanced conditions and deny rules = Enterprise (plan-gated via entitlements).

### 3.4.6 Example
```
Pranav → Agency X → Account Manager → projects.view → CLIENT scope → Nike
Can access:   Nike → Project A, Nike → Project B
Cannot access: Adidas → Project X   (403 + audit entry for denied sensitive access)
```

### 3.4.7 Frontend Rule
The frontend **never** checks `role === 'admin'`. Server returns a capability map per resource (e.g. `{ canEdit, canApprove, canDelete }`) computed by the authz engine; UI only reflects it. Every API call is re-authorized server-side.

## 3.5 Platform Admin (internal)
Separate admin surface for platform staff: tenant lookup, impersonation (with tenant-visible audit + consent setting), plan overrides, feature flags. All actions audited.

## 3.6 Data Ownership
- `identity` module: `users`, `user_credentials`, `sessions`, `mfa_factors`, `sso_connections`, `oauth_accounts`.
- `access` module: `organization_memberships`, `roles`, `role_permissions`, `permissions` (catalog), `role_assignments`, `role_assignment_scopes`, `policy_conditions`.
- `invitations` module: `invitations`, `invitation_links`.

## 3.7 Acceptance Criteria
- Permission check p95 < 5 ms (cached), < 30 ms (cold).
- Revoking a role takes effect on the next request (cache invalidation via event).
- List endpoints never return out-of-scope rows (property-based tests over random scope assignments).
- Every grant/revoke, login, failed login, and denied sensitive access is in the audit log.
