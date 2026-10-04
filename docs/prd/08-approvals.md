# 08 — Approval Engine

Approvals are the most important trust mechanism between an agency and its clients. Dedicated engine, reusable by content, tasks, files, proposals, invoices, and calendars.

## 8.1 Concepts
```
Approval Request (subject: content v3 / file v2 / calendar package / proposal)
└── Steps (sequential or parallel)
    ├── Step 1: Internal (Creative Director)       — rule: ANY of approvers
    ├── Step 2: Account Manager                    — rule: ALL
    └── Step 3: Client (Nike Approvers)            — rule: ANY / ALL / QUORUM(n)
        └── Actions (approve / reject / request changes / comment / delegate)
```

## 8.2 Approval States
Request & step: `PENDING`, `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`, `EXPIRED`, `CANCELLED`. Request also `DRAFT` before sending.

## 8.3 Approval Policies (configurable templates)
- Defined per org/workspace/client/content type; attached to workflow states ([07](07-projects-tasks-and-workflow-states.md)) as entry actions or guards.
- Step config: approvers (users, roles, teams, designations, dynamic like "client's AM", "client approvers of this client"), rule (ANY/ALL/QUORUM), due duration (business hours, client timezone), reminders schedule, escalation target, auto-action on expiry (`EXPIRE` / `AUTO_APPROVE` — opt-in per client contract, audited).
- Parallel steps (e.g. Legal + Brand simultaneously) and conditional steps (e.g. Legal only if `content.has_offer = true`).

## 8.4 Versioning Rules
- An approval is bound to an **exact version** (content version hash / file version ID).
- If the subject changes after approval → approval marked `STALE`; policy decides: require re-approval (default) or allow minor edits (configurable whitelist, e.g. hashtags only).
- Previous versions and their approval outcomes remain viewable with a **side-by-side diff** (caption diff, image compare slider).

## 8.5 Approval Record (immutable trail)
Every approval retains:
- Requested by, requested at, subject + version, steps and approvers
- Each action: actor, actor type (internal/client), action, comment, attachments, timestamp, IP/user agent, device (portal/mobile/email link)
- Previous versions & history
- Feeds audit log ([20](20-non-functional-requirements.md) + security rules)

## 8.6 Approval UX
- **Approval inbox** for internal users and client portal ("Pending approvals: 3").
- **Bulk approval:** month calendar packages — approve all, or per-item approve/reject with comments.
- **Approve from email/WhatsApp link:** signed, single-use, expiring magic link with a lightweight approval page (still logged in as that client user identity; policy can require full login).
- **Mobile-first** approval screen with swipe-style approve / request changes.
- "Request changes" requires a comment or annotation (configurable).
- Delegation: approver delegates to another eligible approver (audited).
- Reminders & escalations via notification engine.

## 8.7 Integration Points
- Workflow guards: "cannot enter Scheduled unless client step APPROVED".
- Automation triggers: `approval.requested`, `approval.completed`, `approval.rejected`, `approval.changes_requested`, `approval.expired`.
- Analytics: turnaround time per client/approver/step, rejection rate, rounds of revision per content item (key SMMA KPI).

## 8.8 Data Ownership (`approvals` module)
`approval_policies`, `approval_policy_steps`, `approval_requests`, `approval_steps`, `approval_step_approvers`, `approval_actions`, `approval_subject_versions` (subject type + id + version ref). Subject data stays in owning modules; approvals reference by `(subject_type, subject_id, version_id)` and call owning module ports for snapshots.

## 8.9 Acceptance Criteria
- Every approval action is reconstructible: who approved what exact version, when, from where.
- Editing approved content triggers stale handling per policy within the same transaction.
- Client can approve a 30-item monthly calendar in under 2 minutes on mobile.
