# Agency OS API (`@agency-os/api`)

NestJS modular monolith for the Social Media Agency Operating System.

## Stack
- **NestJS 11** + TypeScript strict
- **PostgreSQL** + **Prisma** (multi-schema, 26 domain schemas)
- **Redis** (cache, authz, rate limits, BullMQ-ready)
- **Transactional outbox** + domain event bus
- **RFC 7807** Problem Details errors
- **OpenAPI** at `/api/docs`

## Quick start

```bash
# From repo root
docker compose up -d          # Postgres, Redis, MinIO, Mailpit
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm db:generate
pnpm db:migrate             # creates all schemas + tables
pnpm db:seed                # permissions catalog, starter plan
pnpm dev:api                # http://localhost:3001/api
```

Health: `GET /api/health`  
Swagger: `http://localhost:3001/api/docs`

## Register & authenticate

```bash
# Register agency + owner
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@agency.com",
    "password": "SecurePass123!@#",
    "firstName": "Pranav",
    "organizationName": "Acme Social",
    "organizationSlug": "acme-social"
  }'

# Use accessToken + x-organization-id header on subsequent calls
curl http://localhost:3001/api/v1/organizations/current \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"
```

## Module map (30 bounded contexts)

| Module | Route prefix | Status |
|---|---|---|
| `identity` | `/v1/auth` | **Implemented** — register, login, JWT |
| `tenancy` | `/v1/organizations` | **Implemented** — org, workspaces, departments, teams |
| `access` | `/v1/access` | **Implemented** — RBAC engine, permission catalog |
| `audit` | `/v1/audit-logs` | **Implemented** — append-only logs + interceptor |
| `clients` | `/v1/organizations/:orgId/clients` | **Implemented** — clients, brand kit |
| `crm` | `/v1/crm` | Scaffolded + schema |
| `work` | `/v1/work` | Scaffolded + schema |
| `workflow-engine` | `/v1/workflow-engine` | Scaffolded + schema |
| `social` | `/v1/social` | Scaffolded + schema (content, publishing) |
| `engagement` | `/v1/engagement` | Scaffolded + schema (inbox) |
| `approvals` | `/v1/approvals` | Scaffolded + schema |
| `feedback` | `/v1/feedback` | Scaffolded + schema |
| `media` | `/v1/media` | Scaffolded + schema |
| `automation` | `/v1/automation` | Scaffolded + schema |
| `notifications` | `/v1/notifications` | Scaffolded + schema |
| `analytics` | `/v1/analytics` | Scaffolded + schema |
| `reporting` | `/v1/reporting` | Scaffolded + schema |
| `finance` | `/v1/finance` | Scaffolded + schema |
| `time` | `/v1/time` | Scaffolded + schema |
| `billing` | `/v1/billing` | Scaffolded + schema |
| `integrations` | `/v1/integrations` | Scaffolded + schema |
| + 9 more | health endpoints | Scaffolded |

## Architecture

```
apps/api/src/
├── shared/           # tenant context, prisma, redis, outbox, errors, auth guards
├── modules/<domain>/ # hexagonal layout per module
│   ├── application/  # services, ports, commands/queries
│   ├── domain/       # entities, events, policies
│   ├── infrastructure/ # repositories, adapters
│   ├── interface/    # controllers, DTOs, guards
│   ├── jobs/         # BullMQ processors (per module)
│   └── <module>.module.ts
└── app.module.ts
```

**Rules enforced:**
- Every tenant table has `organization_id`
- Modules communicate via **ports** + **outbox events** — no cross-module DB access
- Backend decides permissions; `@RequirePermissions()` + JWT capability map
- All mutating requests audited automatically
- Nothing hardcoded — config validated via Zod at startup

## Database schemas (PostgreSQL)

`shared`, `tenancy`, `identity`, `access`, `invitations`, `crm`, `clients`, `social`, `engagement`, `work`, `workflow`, `approvals`, `feedback`, `media`, `automation`, `notifications`, `analytics`, `reporting`, `finance`, `time`, `customization`, `templates`, `calendar`, `activity`, `audit`, `integrations`, `billing`, `knowledge`

## Next implementation steps (Phase 1 PRD)
1. Invitations flow + email adapter
2. Entitlements service (`billing` module)
3. Work module — projects, tasks, kanban
4. Workflow engine — state machine transitions
5. Social module — content items, composer, scheduling workers
6. RLS policies migration + tenant isolation integration tests
