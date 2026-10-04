# 11 — Workflow Builder & Automation Engine

A first-class, agency-specific automation engine (Zapier/Make-like, but native to agency objects). Major differentiator.

## 11.1 Concepts
```
Automation (versioned, per org/workspace/client)
├── Trigger        (one)
├── Conditions     (tree of AND/OR groups)
├── Actions        (ordered steps; branches; delays)
├── Execution history (runs + step logs)
└── Version        (published / draft)
```

Example:
```
WHEN   Task moves to "Client Review"
IF     Client = ABC
THEN   Create approval request
       → Notify client (push + email)
       → Set deadline = 48 business hours
```

## 11.2 Visual Builder
- Node canvas (trigger → condition → action → branch/delay nodes), vertical flow, drag-and-drop.
- Each node has a schema-driven config form (field pickers, variable insertion like `{{task.title}}`, `{{client.name}}`).
- **Test mode:** run against a sample/real entity in dry-run (no side effects), show step-by-step outputs.
- Draft → Publish (new version); runs always reference the version they started with.
- Templates gallery (platform-provided + agency-saved).

## 11.3 Triggers (event-driven, from domain events)
| Category | Triggers |
|---|---|
| Tasks | Task created, assigned, status changed, due date approaching (offset), overdue, commented |
| Content | Content created, state changed, scheduled, published, publish failed |
| Approvals | Approval requested, completed, rejected, changes requested, expired |
| Feedback | Feedback received, resolved, revision limit reached |
| Files | File uploaded, rights expiring |
| Clients/CRM | Lead created/stage changed/won, client invited, client health changed, CSAT submitted |
| Inbox | Message received, SLA breached, crisis keyword detected |
| Calendar | Event created, meeting ended |
| Finance | Proposal viewed/accepted, contract expiring, invoice overdue, payment received |
| Retainers | Period started, quota at risk, quota exceeded |
| Forms | Form submitted |
| Schedule | Cron/recurrence (every Monday 9:00 client TZ, 1st of month) |
| Webhook | Inbound webhook (signed) |
| Manual | Run button on an entity |

## 11.4 Conditions
Field comparisons on trigger payload + fetched context (via module ports): equals, not, in, contains, >, <, between, is empty, changed from/to, custom fields, membership in team/department, time-of-day/business hours. Nested AND/OR groups. Evaluated by a safe JSON rule evaluator (no code execution).

## 11.5 Actions
| Category | Actions |
|---|---|
| Notify | Send email, push notification, in-app notification, Slack message, Microsoft Teams message, WhatsApp template message (Phase 5) |
| Work | Create task(s) / from template, assign task (user/round-robin/least-loaded in team), change status, add label, set field, move project, add comment |
| Content | Create content item(s), change state, schedule, pause client publishing |
| Approvals/Feedback | Create approval request, request feedback, send reminder |
| Clients | Update client field, create onboarding checklist |
| Calendar | Create calendar event |
| Finance | Create invoice draft, send payment reminder |
| Integrations | Webhook (HTTP, signed), integration actions (provider-defined) |
| Flow control | Delay (duration / until date), branch (if/else), stop |
| AI (Phase 4) | Generate caption draft, summarize, classify |

Actions call owning modules **through their public ports/commands** — the automation module never touches other modules' tables.

## 11.6 Execution Engine
- Domain event → automation matcher (index of active automations by `(org, trigger_type)` cached in Redis; invalidated on publish/disable) → condition evaluation → run enqueued (BullMQ).
- Each step is a job with idempotency key `(run_id, step_id)`; retries with backoff per action type (config); permanent failures stop the run and mark `FAILED`.
- Delays implemented as delayed jobs (durable, survives restarts).
- **Loop protection:** max chain depth and max runs per entity per window (config); actions carry `causation_id` to detect self-triggering loops.
- **Rate limits & quotas** per plan (runs/month) via entitlements.
- Run statuses: `QUEUED`, `RUNNING`, `WAITING` (delay), `SUCCEEDED`, `FAILED`, `CANCELLED`, `SKIPPED`.
- Execution history: per run + per step input/output (PII-redacted), duration, error; retention configurable. Re-run failed step.

## 11.7 SOP Automation (Playbooks)
One-click multi-step procedures, e.g. **New Client Onboarding**:
1. Create client folder structure
2. Create Slack channel
3. Send welcome email
4. Send onboarding form + social access request
5. Assign account manager
6. Schedule kickoff meeting
7. Create retainer project from template
8. Send contract for signature

Implemented as manual-trigger automations with input form; progress visible as checklist.

## 11.8 Templates & Recurring Work
- **Project templates:** tasks, subtasks, relative dates, milestones, approval stages, workflows, content slots, files/folders.
- **Content templates:** e.g. "Reel package" → content item + copy/design/edit tasks + approval policy.
- **Recurring work:** recurrence rules generate projects/tasks/reports/invoices (e.g. weekly planning task every Monday; monthly report on 1st; retainer invoice on 1st; timesheet request every Friday). Idempotent generation keyed by `(rule_id, period)`.

## 11.9 Data Ownership (`automation` module)
`automations`, `automation_versions`, `automation_triggers`, `automation_conditions` (JSON tree), `automation_actions`, `automation_runs`, `automation_run_steps`, `recurrence_rules`, `playbooks`; templates in `templates` module ([17](17-platform-features.md)).

## 11.10 Acceptance Criteria
- Agency builds "Approval rejected + project type = Social → create revision task, assign designer, notify AM, move content to Revision" without code.
- A self-referencing automation is stopped by loop protection with a clear error in history.
- Run history explains exactly why each step ran or was skipped.
