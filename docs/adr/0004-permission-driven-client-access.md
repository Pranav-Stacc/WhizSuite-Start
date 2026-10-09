# ADR 0004: Clients gate UI by effective permissions, not role names

- Status: Accepted
- Date: 2026-10-09

## Context

Agencies compose their own roles from the permission catalog (`packages/contracts/src/auth/permissions.ts`)
and assign one or more roles to a membership, optionally scoped (organization, client, project, …) and with
DENY grants. The API enforces this with `@RequirePermissions` and resolves a member's effective permissions
in `AuthorizationService`, exposed at `GET /api/v1/access/capabilities`.

The web client instead derives one of four fixed personas (owner / manager / creator / client) from the
membership type and gates navigation on those. A custom role therefore has no effect on what the web shows,
and the UI can disagree with what the API actually allows.

## Decision

The mobile app (`apps/mobile`) never infers access from role names or membership types:

- After sign-in it loads `GET /v1/access/capabilities` into an `AccessPolicy` (the granted permission keys),
  caches it per membership for offline use, and refreshes it on an interval
  (`ACCESS_REFRESH_INTERVAL_SECONDS`), on app resume, and on pull-to-refresh.
- Every navigation destination declares the permission keys that unlock it (`anyOf`), matching the
  `@RequirePermissions` on the endpoints its screen loads. Actions use `PermissionGate`.
- The membership type only chooses the audience (agency workspace vs. client portal), because the API
  data-scopes client memberships to their client. Inside each audience, visibility is permission-driven.
- Permission keys, membership types and other constants are generated from `packages/contracts`
  (`pnpm --filter @agency-os/contracts generate:dart`) so the app cannot drift from the API catalog.

## Consequences

- Custom roles edited in Roles & permissions reshape the app without a release or re-login.
- The API stays the authority: hiding a destination is a UX concern; a 403 is still handled everywhere.
- The web should move to the same model (load capabilities, gate `nav-config` by permission) so both
  clients agree with the API. Until then the web ignores custom roles in its navigation.
- Assigning custom roles to an existing member currently has no endpoint (only invitation `roleIds` and the
  membership-type switch); one is needed for full role management from either client.
