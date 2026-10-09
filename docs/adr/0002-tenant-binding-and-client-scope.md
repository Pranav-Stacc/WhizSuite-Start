# ADR 0002: Tenant binding in the auth guard and client-portal scoping

- Status: Accepted
- Date: 2026-10-09

## Context

Live checks showed a user of organization B could read and write organization A data by putting
A's id in the URL or the `x-organization-id` header, because services trusted the requested
organization. Client-portal users (membership type `CLIENT`) could also list other brands' clients,
content, invoices, media and search results. Generic "scaffold" endpoints accepted untyped bodies,
allowing `organizationId` and primary keys to be overwritten.

## Decision

- `JwtAuthGuard` binds the request to the organization in the access token
  (`shared/tenant/tenant-access.ts`). An organization named in the route (`:organizationId`) or the
  header must equal the token's organization, otherwise `403 TENANT_MISMATCH`.
- The access token carries `clientId` for client memberships. `TenantContext.clientScope()` returns
  `undefined` for staff and the allowed client ids for client users; repositories filter list queries
  by it and services check single reads with `TenantContext.canAccessClient()` (404 on miss, so
  existence is not leaked).
- Every mutating endpoint takes a class-validator DTO; the global `ValidationPipe` with
  `forbidNonWhitelisted` rejects unknown fields. Prisma known errors map to Problem Details
  (P2002 → 409, P2003 → 422, P2025 → 404).
- Content status changes follow `CONTENT_TRANSITIONS` in `packages/contracts`.
- Refresh tokens rotate within a family; presenting a rotated (revoked) token revokes the whole
  family (`TOKEN_REUSE_DETECTED`). Rotation claims the old session atomically.

## Consequences

- A token is valid for exactly one organization; switching organizations requires a new token.
- New tenant-owned modules must apply `clientScope()` for any data a client user may see.
- PostgreSQL RLS remains the planned second layer and is not yet enabled.
