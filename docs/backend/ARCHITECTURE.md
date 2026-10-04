# Backend Architecture Summary

See full PRD in `docs/prd/` and live code in `apps/api/`.

## Monorepo
```
apps/api/              NestJS API
packages/contracts/    Shared types, events, permissions, error codes
packages/config/       Shared TS config
docker-compose.yml     Postgres, Redis, MinIO, Mailpit
```

## Cross-cutting (`apps/api/src/shared`)
| Component | Purpose |
|---|---|
| `TenantContext` + middleware | Org scoping, correlation ID |
| `PrismaService` + `withTenant()` | DB + RLS session var |
| `RedisService` | Namespaced cache keys `org:{id}:...` |
| `OutboxService` + relay | Transactional outbox pattern |
| `DomainEventBus` | In-process event dispatch (swappable) |
| `ProblemDetailsFilter` | RFC 7807 errors |
| `JwtAuthGuard` + `PermissionsGuard` | AuthN + AuthZ |
| `AuditInterceptor` | Auto-audit all mutations |

## Data model
- **100+ tables** across 26 PostgreSQL schemas (Prisma multi-schema)
- UUID PKs, `organization_id` on all tenant tables, `createdAt`/`updatedAt`, optimistic `version` where needed
- Money as integer minor units (`feeMinor`, `amountMinor`)

## Implemented API surface (v1)
- `POST /api/v1/auth/register` — create org + owner + default workspace + owner role
- `POST /api/v1/auth/login`
- `GET /api/v1/organizations/current`
- `GET|POST /api/v1/organizations/:id/workspaces`
- `GET|POST /api/v1/organizations/:id/departments`
- `POST /api/v1/organizations/:id/teams`
- `GET|POST /api/v1/organizations/:id/clients`
- `PATCH /api/v1/organizations/:id/clients/:clientId/brand-kit`
- `GET /api/v1/audit-logs`
- `GET /api/v1/<module>/health` — all 30 modules
