# ADR 0004: Clients gate UI by effective permissions, not role names

- Status: Accepted
- Date: 2026-10-09
- Updated: 2026-10-09

## Context

Agencies compose their own roles from the permission catalog (`packages/contracts/src/auth/permissions.ts`)
and assign one or more roles to a membership, optionally scoped (organization, client, project, …) and with
DENY grants. The API enforces this with `@RequirePermissions` and resolves a member's effective permissions
in `AuthorizationService`, exposed at `GET /api/v1/access/capabilities`.

Clients must not infer what a user can see from membership type labels or a fixed set of named roles.
Custom roles only work if navigation and actions follow the same permission keys the API enforces.

## Decision

Both clients load effective permissions and gate UI on those keys:

### Mobile (`apps/mobile`)

- After sign-in it loads `GET /v1/access/capabilities` into an `AccessPolicy` (the granted permission keys),
  caches it per membership for offline use, and refreshes it on an interval
  (`ACCESS_REFRESH_INTERVAL_SECONDS`), on app resume, and on pull-to-refresh.
- Every navigation destination declares the permission keys that unlock it (`anyOf`), matching the
  `@RequirePermissions` on the endpoints its screen loads. Actions use `PermissionGate`.
- Permission keys, membership types and other constants are generated from `packages/contracts`
  (`pnpm --filter @agency-os/contracts generate:dart`) so the app cannot drift from the API catalog.

### Web (`apps/web`)

- Live mode loads `GET /v1/access/capabilities` once per request (`getPermissions`); demo mode uses the
  default permission set for the signed-in membership type.
- Navigation, quick-create, search domains, page guards and server actions use `can` /
  `requirePermission` / `authorize` against those keys — not owner / manager / creator labels.
- Team management assigns roles via `PUT …/members/:userId/roles`; invitations accept `roleIds`.
  Changing a membership type keeps custom roles and only swaps the matching system role.

### Shared

- Membership type only chooses the audience (agency workspace vs. client portal), because the API
  data-scopes client memberships to their client. Inside each audience, visibility is permission-driven.

## Consequences

- Custom roles edited in Roles & permissions reshape both clients without a release.
- The API stays the authority: hiding a destination is a UX concern; a 403 is still handled everywhere.
- Demo sign-in personas remain a convenience for exploring the product; they are not an authorization model.
