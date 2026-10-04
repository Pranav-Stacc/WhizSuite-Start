# Agency OS for Social Media Agencies — Product Requirements Document

**Status:** Draft v1.0 · **Date:** 04 Oct 2026 · **Owner:** Pranav

> The operating system for modern social media agencies: win clients, plan content, produce creatives, get approvals, publish, engage, report, and bill — in one multi-tenant, white-labelable platform.

## How to read this PRD
Start with **01** (why/who), then **22** (what ships when). Domain documents (02–19) define features, data ownership, events, and acceptance criteria per module. **20–21** define quality bars and architecture. Engineering standards live in `.cursor/rules/` and apply to everything here.

## Index
| # | Document | Summary |
|---|---|---|
| 01 | [Product Overview](01-product-overview.md) | Vision, problem, personas, positioning, competitors, metrics |
| 02 | [Multi-Tenancy & Workspace](02-tenancy-and-workspace.md) | Agency isolation, workspaces, nested departments/designations, teams, branding, custom domains |
| 03 | [Identity & Access Control](03-identity-and-access-control.md) | Auth, invitations, RBAC + scopes + conditions, permission catalog, system roles |
| 04 | [CRM & Clients](04-crm-and-clients.md) | Leads pipeline, clients/brands, brand kit, retainers & deliverable quotas, onboarding, health score |
| 05 | [Social Publishing](05-social-publishing.md) | Accounts, campaigns, content items, composer, content calendar, scheduling/publishing engine |
| 06 | [Engagement Inbox](06-engagement-inbox.md) | Unified comments/DMs/mentions, assignment, SLA, saved replies, sentiment |
| 07 | [Projects, Tasks & Workflow States](07-projects-tasks-and-workflow-states.md) | Projects, tasks, views, configurable state machine with guards |
| 08 | [Approvals](08-approvals.md) | Multi-step versioned approval engine, bulk calendar approvals |
| 09 | [Feedback & Creative Review](09-feedback-and-creative-review.md) | Image pins, video timestamps, PDF comments, revision rounds |
| 10 | [Media Library](10-media-library.md) | DAM-lite, versions, renditions, sharing, rights, storage architecture |
| 11 | [Automation Engine](11-automation-engine.md) | Visual workflow builder, triggers/conditions/actions, SOP playbooks, templates, recurring work |
| 12 | [Analytics & Reporting](12-analytics-and-reporting.md) | Social & operational analytics, ads, dashboards, white-label client reports |
| 13 | [Client Portal & White-Label](13-client-portal-and-white-label.md) | Client experience, visibility rules, white-label levels |
| 14 | [Finance & Operations](14-finance-and-operations.md) | Proposals, contracts, GST invoicing, time tracking, capacity, profitability |
| 15 | [Notifications](15-notifications.md) | Central multi-channel engine, preferences, quiet hours, digests |
| 16 | [AI Features](16-ai-features.md) | Brand-voice content, agency intelligence, inbox AI, semantic search |
| 17 | [Platform Features](17-platform-features.md) | Custom fields, forms, templates, calendar, search, command palette, realtime, activity, audit, KB |
| 18 | [Integrations & API](18-integrations-and-api.md) | Integration framework, provider roadmap, public API, webhooks, marketplace |
| 19 | [SaaS Billing](19-saas-billing.md) | Plans as data, entitlements, packaging, lifecycle, metering |
| 20 | [Non-Functional Requirements](20-non-functional-requirements.md) | Performance, scale, reliability, security, privacy (DPDP/GDPR), observability |
| 21 | [Technical Architecture](21-technical-architecture.md) | Modular monolith, module map, events, data layer, caching, frontend, infra, ERD |
| 22 | [Roadmap & MVP](22-roadmap-and-mvp.md) | Phases, MVP scope, release criteria, risks, open questions |

## Core Differentiators
1. Agency-defined content pipelines (configurable state machine) — no custom development.
2. RBAC + resource-level scopes (e.g. Account Manager sees only assigned clients).
3. Versioned approval + contextual creative review engine.
4. Branded client portal with mobile-first approvals.
5. Retainer deliverable tracking + profitability tied to actual work.
6. Plan → produce → approve → publish → engage → report → bill in one system.

## Next Deliverables (before code)
- Detailed ERD / Prisma schema per module (Phase 1 modules first)
- API specification (OpenAPI) for Phase 1–2
- Permission matrix (role × permission × default scope) spreadsheet
- Workflow engine & approval engine technical specs
- Event catalog (`packages/contracts`)
- Screen-by-screen UI map & wireframes (internal app + portal)
