# ADR 0005: Role kinds (access vs workflow) and data scopes

- Status: Accepted
- Date: 2026-10-09

## Context

Custom roles already compose permission keys end-to-end (contracts → API → web/mobile), and
memberships are assigned roles via `RoleAssignment` / `RoleAssignmentScope`. Until now:

- Role create/edit only collected permission keys (no intended data scope).
- Assignments always wrote an `ORGANIZATION` scope; the existing scope table was unused by UI/API.
- Workflows were linear stage-name pipelines with no link to assignee pools.
- Approvals/workflow PRDs expect resolving people by **role** (and later designation/team).

Hardcoded persona labels (owner/manager/creator) remain out of the authorization path — see ADR 0004.

## Decision

### Role kinds

`Role.kind` is either:

| Kind | Purpose |
|---|---|
| `ACCESS` | Grants permissions from the catalog (existing behaviour). Requires ≥1 permission key. |
| `WORKFLOW` | Named assignee pool for workflow stages. Permissions optional (usually empty). |

System roles seeded for membership types stay `ACCESS` @ `ORGANIZATION`.

### Data scopes

- **On the role definition:** `defaultScopeTypes` (JSON array of assignable `ScopeType`s) documents where the role is intended to apply (org / client / project / …). Shown in create/edit UI.
- **On assignment:** reuse `RoleAssignmentScope`. `PUT …/members/:userId/roles` accepts optional `scopes`; when omitted, defaults to `ORGANIZATION` (backward compatible).
- Effective permission evaluation already expands assignment scopes in `AuthorizationService.can` / `getPermissionGrants`.

### Workflow stages

Stage assignee role is stored in `WorkflowState.guards` as `{ assigneeRoleId }` (no new workflow column). The API DTO exposes `stages: { name, assigneeRoleId? }[]`. Resolving memberships for a role (optionally by client/project scope) is available via `RoleAssignmentService.membershipIdsForRole` for future transition/assignment engines.

## Consequences

- Migration `20261009180000_role_kind_and_scopes` adds `kind` + `default_scope_types` on `access.roles`.
- Contracts export `RoleKinds`, `AssignableScopeTypes`, structured workflow stages; regenerate Dart after build.
- Web Roles UI sets kind + scopes; Team assign picks assignment scope type; Workflows UI attaches workflow roles per stage.
- Clients must not gate features on role *names* or kind alone for access control — still use capabilities/permissions (ADR 0004). Workflow kind is only for assignee configuration.
