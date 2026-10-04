# 22 — Roadmap, MVP & Release Plan

Building everything first = a 2-year product. Ship a focused, lovable MVP for social media agencies, then expand.

## 22.1 MVP Definition (Phases 1–3 → private beta, ~6–8 months with a small senior team)
**MVP promise:** *"Plan, produce, get client approval, and publish social content for all your clients — in one place."*

Must-have for beta: multi-tenancy, auth, invitations, RBAC + scopes, clients + brand kit, configurable content pipeline, content calendar, composer, approvals (internal + client), creative review on images/video, client portal, Instagram + Facebook + LinkedIn publishing, notifications (in-app + email), audit log, basic analytics.

> Note: social publishing is pulled into the MVP (vs generic agency roadmap) because it is the core value for social media agencies.

## 22.2 Phases

### Phase 1 — Foundation (≈ 8–10 weeks)
- Monorepo, CI/CD, Docker, observability baseline, config framework, outbox/event bus, audit module
- Multi-tenant organizations + RLS, workspaces
- Identity (email/password, Google, magic link, MFA), sessions
- Invitations; memberships (employee, contractor, client user)
- Authorization engine (RBAC + scopes) + seeded roles + capability maps
- Departments (tree) + designations, teams, locations
- Clients, contacts, brand kit (basic)
- Branding (logo/colors)
- Notifications: in-app + email; preferences (basic)
- SaaS billing skeleton: plans/entitlements as data, trial

**Exit criteria:** cross-tenant isolation tests green; AM scope demo works; audit log captures all actions.

### Phase 2 — Agency Work (≈ 8–10 weeks)
- Projects, tasks, subtasks, dependencies, comments, activity
- Workflow engine (configurable states, transitions, guards) for tasks and content
- Views: List, Kanban, Calendar, Table
- Media library (upload, folders, tags, versions, previews, signed URLs)
- Content items + composer (master + variants) + content calendar (month/week/list)
- Client portal v1 (dashboard, calendar, files, messages)
- Realtime updates
- ICS feeds

**Exit criteria:** an agency runs a full month of content planning for 3 clients without spreadsheets.

### Phase 3 — Approvals, Review & Publishing (≈ 10–12 weeks) → **Private Beta**
- Approval engine (multi-step, versions, bulk calendar approvals, email magic-link approvals)
- Creative review: image pins/areas, video timestamps, PDF comments, version compare
- Social: Instagram, Facebook, LinkedIn connect (agency + client-granted OAuth), scheduling, auto/notify publish, pre-flight checks, crisis pause
- Basic post & account analytics + standard report (PDF/link)
- Retainer deliverable quotas & tracker
- Custom fields (core entities)
- Web push; Slack notifications
- Time tracking (timer, entries)
- Agency invoicing v1 (GST, recurring retainer invoices, Razorpay links)
- SaaS billing live (Razorpay/Stripe)

**Exit criteria:** 10–20 design-partner agencies publishing approved content weekly; approval turnaround measured.

### Phase 4 — Growth & Intelligence (≈ 3–4 months) → **Public Launch**
- Engagement inbox (comments + DMs for Meta, LinkedIn comments), SLA, saved replies
- YouTube, TikTok, X, Pinterest
- Automation builder v1 (triggers/conditions/actions, templates, run history), recurring work, playbooks
- Forms (onboarding, briefs) → automations
- Advanced analytics, custom dashboards, white-label scheduled reports
- CRM pipeline + lead conversion; proposals with e-sign
- Capacity/workload view, leave
- AI: captions (brand voice), hashtags, ideas, report summaries, inbox reply suggestions, sentiment
- Google/Outlook calendar sync, Google Drive/Dropbox/Canva import
- Custom portal domain + email sending domain
- Global search (Postgres FTS), command palette
- Client health score, CSAT/NPS

### Phase 5 — Enterprise & Scale
- SSO (SAML/OIDC), SCIM, IP allowlist, advanced RBAC (conditions, deny)
- Full white-label (app domain, login page, PWA)
- Public API, outbound webhooks, API keys, service accounts
- Contracts module, expenses, profitability, accounting sync
- Paid ads insights; competitor benchmarking; best time to post; evergreen queues; link in bio
- WhatsApp Business (notifications + inbox), SMS
- Native mobile apps (employee + client)
- Knowledge base, meeting assistant, creative QA AI
- Data residency (EU), dedicated infrastructure option, SOC 2 Type II
- Dedicated search engine; analytics columnar store

### Phase 6 — Ecosystem
- Marketplace & third-party apps, GraphQL API
- Social listening
- Agency-to-agency collaboration (outsourcing with isolated permissions)
- Influencer management (discovery, outreach, contracts, content approvals, payments)

## 22.3 Release Criteria (every phase)
- All acceptance criteria in relevant PRD sections pass.
- Security review + tenant isolation suite green; audit coverage verified.
- p95 performance targets met in staging load test.
- Docs: user help center articles, API docs (if applicable), ADRs updated.
- Feature flags allow gradual rollout per org.

## 22.4 Key Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Social platform API approvals (Meta/TikTok app review) delay launch | Start app reviews in Phase 1; NOTIFY_PUBLISH fallback; design partners in test mode |
| API rate limits / pricing changes (esp. X) | Capability config, per-platform rate budgets, plan-level channel pricing |
| Scope creep (it's an "OS") | Strict phase gates; MVP promise; entitlements to hide unfinished features |
| Tenant data leak | RLS + app scoping + automated tests + pen testing |
| Publishing reliability | Isolated workers, idempotency, pre-flight checks, monitoring & alerting, status page |
| Client adoption of portal | Magic-link approvals, mobile-first, WhatsApp/email nudges, free client seats |
| Complexity of configurable workflows | Opinionated starter templates; guided setup wizard |

## 22.5 Open Questions
1. Pricing axis: per seat, per client, per channel, or hybrid? (validate with design partners)
2. Card-required trial vs no-card trial?
3. Primary cloud provider and region strategy (AWS Mumbai assumed).
4. Build vs buy for e-signature and social listening.
5. Do we support personal (non-business) Instagram accounts via notify-publish only?
6. Data retention defaults per plan for inbox messages and analytics raw data.
7. Should agencies be able to resell sub-accounts (agency-of-agencies / reseller model)?
