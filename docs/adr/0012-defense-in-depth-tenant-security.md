# ADR 0012: Defense-in-depth tenant security

## Status

Accepted

## Context

Tenant isolation relied on manual `organizationId` filters in repositories, decorator-based JWT/RBAC, optional audit calls, and a basic outbox poller. A missed guard or unscoped query could leak cross-tenant data.

## Decision

1. **Global guards**: `GlobalJwtAuthGuard` + `StrictPermissionsGuard` (default-deny on `/organizations/:id/*` and audit routes without `@RequirePermissions`). `@Public()` and `@AllowAuthenticated()` opt out explicitly.
2. **Prisma tenant extension**: Auto-inject `organizationId` on tenant models (from DMMF) and set `app.current_org_id` per query when `TenantContext` is present. `TenantContext.runSystem()` bypasses for outbox/schedulers.
3. **PostgreSQL RLS**: Policies on all tables with `organization_id`, aligned with `app.current_org_id` (empty setting = migration/admin bypass only).
4. **Outbox**: `FOR UPDATE SKIP LOCKED` claiming, exponential backoff, `DEAD` status after `OUTBOX_MAX_ATTEMPTS`.
5. **Agent runtime**: Generic 502 responses; details only in server logs.
6. **Audit**: Existing global `AuditInterceptor` on mutating HTTP methods remains; domain services keep explicit `@Audit`-style records for entity diffs.

## Consequences

- New HTTP routes under organizations **must** declare `@RequirePermissions` or fail closed at runtime.
- Background jobs must use `TenantContext.runSystem()` or set tenant context before Prisma calls.
- RLS applies in production after migration; local tests with empty `app.current_org_id` still work for bootstrap paths that skip setting the GUC.
