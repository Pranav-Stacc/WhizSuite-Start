# 17 — Cross-Cutting Platform Features

Custom fields, forms, templates, calendar, search, command palette, realtime, activity, audit, knowledge base.

## 17.1 Custom Fields
Agencies add fields without schema changes.
- Applies to: clients, leads, projects, tasks, campaigns, content items, contacts, files.
- Types: text, long text, number, currency, percent, date, datetime, dropdown (single/multi), checkbox, user, team, relation (to client/project/brand), URL, email, phone, rating, formula (Phase 4).
- **Storage:** `custom_field_definitions` (metadata, validation, options, scope: org/workspace/client) + entity `custom_fields JSONB` column validated against definitions on write; GIN index (`jsonb_path_ops`) for filtering; expression indexes for frequently filtered fields (managed automatically when a field is marked "filterable", with configurable limits).
- Field-level permissions (view/edit by role) and client visibility flag.
- Usable in views, filters, workflow guards, automations, reports, forms.
- Deleting a field: soft-delete definition + background cleanup job.

## 17.2 Forms
- Form builder: fields (incl. file upload), sections, conditional logic, validation, branding, multi-step.
- Audiences: public link, client portal (authenticated), internal.
- Examples: client onboarding, creative brief, campaign brief, content request, feedback/CSAT, lead capture (embeddable on agency website).
- Submission → automation trigger `form.submitted` → e.g. create client → create project → create tasks → assign team → start workflow → notify AM.
- Spam protection (Turnstile/hCaptcha configurable), rate limits, file scanning.

## 17.3 Templates (single `templates` module)
Project, content, task, checklist, approval policy, workflow, automation, report, proposal, contract, form, email/notification, caption snippets. Scopes: platform gallery, org, workspace. Versioned; "create from template" records origin for analytics.

## 17.4 Unified Calendar
```
Calendar
├── Tasks & deadlines
├── Content (scheduled/published)
├── Meetings
├── Campaigns
├── Approvals (due dates)
├── Milestones
└── Holidays / leave / key dates
```
- Views: Day, Week, Month, Agenda; layer toggles; filters by client/team/user.
- Meetings: create with Google Meet/Zoom/Teams links, attendees (internal + client), agenda, notes, linked client/project; meeting notes shareable to portal.
- Integrations: Google Calendar & Outlook two-way sync (Phase 4); ICS subscription feeds (Phase 2) — tokenized, revocable.
- Calendar module **reads** other domains via their query ports/events into a calendar projection table (`calendar_items`) for fast range queries — it does not own tasks/content.

## 17.5 Global Search
- One search across clients, projects, tasks, content, captions, files, comments, approvals, meetings, contacts, leads, knowledge base.
- **Phase 1–3:** PostgreSQL full-text search (`tsvector` columns + GIN) + trigram for fuzzy names, per-module search providers federated by a `search` module.
- **Phase 4+:** dedicated engine (OpenSearch/Meilisearch/Typesense) fed by events via a `SearchIndexPort`; semantic search via pgvector ([16](16-ai-features.md)).
- Results always filtered by authz scope at query time.

## 17.6 Command Palette (Ctrl/Cmd + K)
Create task/content/project, invite user, search client, schedule meeting, upload file, start timer, create approval, open calendar, switch org/workspace, navigate anywhere. Actions registered per feature module (frontend registry), permission-aware from capability map.

## 17.7 Realtime
- WebSocket gateway (NestJS + Socket.IO) with **Redis adapter** for horizontal scale; can be extracted into a dedicated realtime service later.
- Auth on connect (session cookie/JWT), authorization per room subscription (`org:{id}`, `project:{id}`, `content:{id}`, `file_version:{id}`, `user:{id}`).
- Events pushed: `task.updated`, `content.state_changed`, `comment.created`, `feedback.comment_added`, `approval.created`, `approval.completed`, `file.uploaded`, `notification.created`, `presence.*`, `inbox.message_received`.
- Payloads are minimal (IDs + changed fields); clients refetch via server data layer where needed.
- Presence (who's viewing/editing) with TTL in Redis.

## 17.8 Activity Feed vs Audit Log
| | Activity feed | Audit log |
|---|---|---|
| Purpose | Collaboration context ("Priya moved Post #27 to Client Review") | Compliance & security record |
| Audience | Users within scope (clients see client-visible activity) | Admins with `audit.view` |
| Mutability | Can be pruned per retention | Append-only, immutable |
| Content | Human-friendly summaries | Actor, org, action, resource, before/after, IP/UA, correlation ID, outcome |

**Audit log covers every action** (all CRUD, auth events, permission changes, sensitive reads/exports, admin & config changes, system/job actions, AI-assisted actions) — see project security rules. Example:
```
Pranav changed Project "Website Redesign"
Status: In Progress → Client Review
04 Oct 2026 20:14 IST · IP 103.x.x.x · Chrome/Windows · corr-id 7f3a…
```
Audit UI: filter by actor, resource, action, date; export CSV (audited); retention per plan.

## 17.9 Knowledge Base (Phase 4)
Agency wiki: SOPs, brand guidelines, playbooks, templates, onboarding docs. Rich-text pages, nested, permissions, client-visible pages option, version history, AI search over it.

## 17.10 Data Ownership
- `customization`: `custom_field_definitions`, `custom_field_options`, `forms`, `form_versions`, `form_submissions`.
- `templates`: `templates`, `template_versions`.
- `calendar`: `calendar_items` (projection), `meetings`, `meeting_attendees`, `calendar_connections`, `ics_feeds`.
- `search`: search documents/index config.
- `activity`: `activity_events`.
- `audit`: `audit_logs` (partitioned monthly, append-only).
- `knowledge`: `kb_spaces`, `kb_pages`, `kb_page_versions`.
