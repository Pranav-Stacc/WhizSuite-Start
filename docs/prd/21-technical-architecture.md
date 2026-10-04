# 21 — Technical Architecture

## 21.1 Stack Decision
Per project engineering rules (`.cursor/rules/`): **NestJS + TypeScript (strict)**, **PostgreSQL + Prisma**, **Redis**, **BullMQ**, **Next.js App Router**, **pnpm + Turborepo monorepo**. (Earlier Django/Celery suggestions are superseded: BullMQ replaces Celery; NestJS WebSocket gateway + Redis adapter replaces Django Channels.)

## 21.2 High-Level Architecture
```
                           CDN (static, signed media)
                                   │
                     Next.js (apps/web) — SSR, Server Actions, BFF
                     ├── internal app routes   ├── /portal routes (client)
                                   │
                         API (apps/api) — NestJS modular monolith
           ┌──────────────┬────────┴─────────┬──────────────────┐
           │              │                  │                  │
     REST /api/v1   WebSocket gateway   Webhook ingress   Public API /api/public/v1
           │              │                  │                  │
           └──────────────┴───── Domain modules (ports & adapters) ┘
                                   │
         ┌──────────────┬──────────┼─────────────┬───────────────────┐
     PostgreSQL       Redis      BullMQ workers   Object storage    External providers
   (RLS, Prisma)  (cache, pub/sub, (publishing,    (S3/R2 + CDN)   (Meta, LinkedIn, Google,
                   rate limits,   notifications,                    Razorpay, Stripe, SES…)
                   presence)      automations,
                                  analytics sync,
                                  media processing,
                                  reports)
```
Deployables (same codebase, different entrypoints): `api` (HTTP + WS), `worker-publishing`, `worker-default` (notifications, automations), `worker-analytics`, `worker-media`, `web`. Scale independently.

## 21.3 Domain Modules (bounded contexts → future microservices)
| Module | Owns | Key ports exposed | Extraction priority |
|---|---|---|---|
| `tenancy` | orgs, workspaces, departments, designations, teams, locations, branding, domains | `TenantQueryPort`, `OrgStructurePort` | Low |
| `identity` | users, credentials, sessions, MFA, SSO | `IdentityPort` | Medium (auth service) |
| `access` | memberships, roles, permissions, scopes, conditions | `AuthorizationPort` (`can`, `scopeFilter`, `capabilities`) | Medium |
| `invitations` | invitations, links | `InvitationPort` | Low |
| `crm` | pipelines, leads, activities | `LeadPort` | Low |
| `clients` | clients, brands, contacts, brand kits, retainers, health | `ClientQueryPort`, `RetainerPort` | Low |
| `social` | accounts, channels, campaigns, content, variants, versions, publishing | `ContentPort`, `PublishingPort` | **High** (publishing service) |
| `engagement` | inbox conversations/messages, SLA, rules | `InboxPort` | High |
| `work` | projects, tasks, milestones, views, discussions | `ProjectQueryPort`, `TaskCommandPort` | Medium |
| `workflow-engine` | workflow definitions, states, transitions, history | `WorkflowEnginePort` | Medium |
| `approvals` | policies, requests, steps, actions | `ApprovalPort` | Medium |
| `feedback` | threads, annotations, comments | `FeedbackPort` | Medium |
| `media` | assets, versions, renditions, folders, shares, rights | `MediaPort`, `StoragePort` | High (media service) |
| `automation` | automations, versions, runs, recurrence, playbooks | `AutomationPort` | High |
| `notifications` | types, templates, deliveries, preferences | `NotificationPort` | **High** |
| `analytics` | metrics, snapshots, rollups, dashboards | `AnalyticsQueryPort` | High |
| `reporting` | report templates, reports, deliveries | `ReportPort` | Medium |
| `finance` | proposals, contracts, invoices, payments, expenses | `InvoicePort`, `ContractPort` | Medium |
| `time` | time entries, timesheets, rates, capacity, leave | `TimePort`, `CapacityPort` | Medium |
| `customization` | custom fields, forms | `CustomFieldPort`, `FormPort` | Low |
| `templates` | all template types | `TemplatePort` | Low |
| `calendar` | calendar projection, meetings, sync | `CalendarPort` | Medium |
| `search` | search index/providers | `SearchPort` | High |
| `activity` | activity feed | `ActivityPort` | Low |
| `audit` | audit logs | `AuditPort` | Medium |
| `integrations` | providers, connections, credentials, webhooks, API keys | `IntegrationPort` | High |
| `ai` | prompts, embeddings, usage | `AiPort` | High |
| `billing` | plans, subscriptions, entitlements, usage | `EntitlementPort`, `UsagePort` | Medium |
| `knowledge` | KB spaces/pages | `KnowledgePort` | Low |
| `realtime` (infra) | WS gateway, presence | `RealtimePublisherPort` | High |
| `shared` (lib) | tenant context, outbox, event bus, cache, config, logging, errors, pagination | — | n/a |

### Module internal layout (backend)
```
apps/api/src/modules/<module>/
├── application/        # use cases (commands/queries), ports (interfaces), DTO mapping
├── domain/             # entities, value objects, domain events, policies (pure TS)
├── infrastructure/     # Prisma repositories, provider adapters, cache, queue processors
├── interface/          # controllers, WS handlers, guards, decorators, validators, DTOs
├── config/             # module config schema (validated)
├── events/             # published/consumed event contracts (re-exported from packages/contracts)
├── jobs/               # BullMQ processors & schedulers
├── tests/
└── <module>.module.ts  # exports only public ports
```

## 21.4 Inter-Module Communication
- **Synchronous:** via exported ports (DI tokens) — later replaced by HTTP/gRPC clients implementing the same port.
- **Asynchronous:** domain events written to `outbox` table in the same transaction → relay → in-process event bus (BullMQ/Redis streams) → subscribers. Swappable for Kafka/RabbitMQ/SQS later.
- Event envelope: `{ id, type, version, organizationId, occurredAt, actor, correlationId, causationId, payload }` — schemas in `packages/contracts`.
- **No cross-module DB access or joins.** Read models/projections (e.g. `calendar_items`, search docs) built from events when cross-domain views are needed.

## 21.5 Data Layer
- Single Postgres cluster today; **schema per module** (Postgres schemas: `tenancy`, `social`, `work`, …) via Prisma multi-schema → physical separation already in place for future extraction.
- UUID v7 primary keys (time-ordered, index-friendly).
- RLS on all tenant tables; `organization_id` in every composite index.
- Partitioned tables: `audit.audit_logs`, `analytics.metric_snapshots`, `engagement.inbox_messages`, `notifications.notifications`, `automation.automation_run_steps`.
- Migrations: Prisma migrate, run as deploy step; backward-compatible (expand → migrate → contract).

## 21.6 Caching (Redis)
- Keys: `org:{orgId}:{module}:{entity}:{id}:v{schemaVersion}`.
- Cached: authz effective permissions, entitlements, tenant/domain resolution, branding theme, workflow definitions, automation trigger index, platform capabilities, dashboard rollups, unread counts.
- Invalidation on write paths + event-driven invalidation (works across services); TTLs from config.
- Next.js cache tags mirror backend entities; backend invalidation events trigger `revalidateTag` via an internal webhook to `web`.

## 21.7 Frontend Architecture (apps/web)
```
apps/web/src/
├── app/
│   ├── (auth)/login, signup, invite/[token]
│   ├── (app)/[orgSlug]/
│   │   ├── dashboard  clients  crm  projects  tasks  content  calendar
│   │   ├── approvals  inbox  media  analytics  reports  automations
│   │   ├── finance  time  knowledge  settings
│   └── (portal)/portal/[clientId]/ dashboard approvals calendar review files messages reports billing
├── features/<domain>/ components hooks forms validation types services(data-access) actions utils
├── shared/ ui (shadcn) layout lib config i18n
└── middleware.ts (tenant/domain resolution, auth gate, portal vs app routing)
```
- Server Components by default; Server Actions for mutations; data-access per feature calls API server-to-server (internal URL never exposed).
- Client state only where needed: React Query for interactive client-side data (kanban, inbox, realtime-updated lists), Zustand for local UI state, React Hook Form + Zod (from contracts).
- Capability maps from API drive UI permissions.

## 21.8 Infrastructure & DevOps
- Docker images per deployable; docker-compose for local (Postgres, Redis, MinIO, Mailpit).
- Cloud-agnostic (AWS primary candidate: ECS/EKS, RDS Postgres, ElastiCache, S3 + CloudFront, SES); Mumbai region default.
- CI/CD: lint → typecheck → boundary check → unit → integration (Testcontainers) → build → e2e (Playwright) → deploy (staging → prod, blue/green or rolling); migrations as gated step.
- IaC (Terraform), environments: local, preview (per PR, Phase 3), staging, production.

## 21.9 Core ERD (high level, grouped by module schema)
```
tenancy:    organizations ─< workspaces ─< teams ─< team_members
            organizations ─< departments(tree) ─< designations ─< member_designations
access:     users ─< organization_memberships >─ organizations
            roles ─< role_permissions >─ permissions
            role_assignments(membership, role) ─< role_assignment_scopes(scope_type, resource_id)
clients:    clients ─< client_brands, client_contacts, client_assignments, brand_kits,
            retainers ─< retainer_deliverable_quotas
social:     social_accounts ─< social_channels
            campaigns ─< content_items ─< content_variants(channel) ─< publish_jobs ─< publish_attempts
            content_items ─< content_versions
work:       projects ─< tasks ─< task_assignees, task_dependencies, task_comments
workflow:   workflow_definitions ─< workflow_versions ─< workflow_states, workflow_transitions
            entity_state_history(entity_type, entity_id)
approvals:  approval_requests(subject_type, subject_id, version_id) ─< approval_steps ─< approval_actions
feedback:   feedback_threads(subject, version) ─< feedback_annotations, feedback_comments
media:      media_folders ─< media_assets ─< media_asset_versions ─< media_renditions
automation: automations ─< automation_versions ─< automation_runs ─< automation_run_steps
notifications: notifications ─< notification_deliveries; notification_preferences
finance:    proposals ─< proposal_items; contracts; invoices ─< invoice_items; payments
time:       time_entries; timesheets; cost_rates; bill_rates
billing:    plans ─< plan_versions ─< plan_entitlements; subscriptions; usage_records
audit:      audit_logs (partitioned)
```
Cross-module references are by ID only (no FK across module schemas), validated through ports; within a module, full FKs and constraints.
