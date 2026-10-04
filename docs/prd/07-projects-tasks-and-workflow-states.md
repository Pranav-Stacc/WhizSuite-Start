# 07 — Projects, Tasks & Configurable Workflow States

## 7.1 Projects
A project groups work for a client, e.g. "Q4 Festive Campaign", "Monthly Retainer — Oct", "Brand Launch".

```
Project
├── Campaigns (social)
├── Content items
├── Tasks & Subtasks
├── Milestones
├── Files
├── Discussions
├── Approvals
├── Feedback
├── Calendar
├── Budget
├── Time tracking
└── Reports
```
- Fields: client, workspace, name, type (configurable: Retainer, One-off Campaign, Launch, Shoot, Ads), owner, members/teams, start/end, status (configurable), budget (fee/hours), billing type (fixed, retainer, hourly, milestone), custom fields, template origin.
- **Recurring retainer projects:** auto-created each period from template (e.g. "Nike — Nov 2026 Retainer") with deliverable-driven content slots ([11](11-automation-engine.md) recurring work).
- Project health: on-track / at-risk / off-track (computed from overdue tasks, approval delays, budget burn; thresholds configurable).

## 7.2 Tasks
- Fields: title, description (rich text), type (configurable: Copy, Design, Video, Shoot, Review, Admin…), status (from workflow), assignees (multiple), watchers, reviewer, priority (configurable scale), start/due dates, estimate, time logged, labels, dependencies, parent/subtasks, checklist, attachments, linked content item, custom fields.
- **Dependencies:** finish-to-start (MVP), others later; cycle detection on insert (DFS O(V+E) on the affected subgraph).
- **Recurring tasks** via recurrence rules (RRULE).
- Bulk edit, duplicate, move between projects (permission-checked, audit logged).
- Comments with @mentions, reactions, attachments; activity feed per task.

## 7.3 Views (shared across tasks & content)
| View | Notes |
|---|---|
| List | Grouping, sorting, inline edit |
| Kanban | Columns = workflow states; transition guards enforced on drop |
| Calendar | By due/scheduled date |
| Timeline | Horizontal date ranges |
| Gantt | Dependencies + critical path (Phase 3) |
| Workload | Per-person capacity vs assigned estimates ([14](14-finance-and-operations.md)) |
| Table | Spreadsheet-style with custom fields |

- **Saved views** (personal/shared) with filters, columns, grouping. Stored as JSON view definitions, validated against a schema.
- Server-side filtering/pagination (cursor); no client-side full loads.

## 7.4 Configurable Workflow States (State Machine Engine)
Agencies **define their own pipelines** — one for tasks, one or more for content (per content type or client), one for projects.

Example content pipeline:
```
Brief → Assigned → In Progress → Internal Review → Client Review
      → Changes Requested → Final Approval → Scheduled → Published
```
Another agency:
```
Brief → Strategy → Copy → Design → Legal → Client → Revision → Approval → Schedule
```

### Workflow definition
- `workflow_definitions` (versioned; entity type: TASK / CONTENT / PROJECT; scope: org/workspace/client/content type).
- `workflow_states`: name, color, category (`NOT_STARTED`, `ACTIVE`, `REVIEW`, `DONE`, `CANCELLED` — category drives reporting/analytics across differing custom states), order, is_initial, is_terminal.
- `workflow_transitions`: from → to, label, and **guards**.

### Per-state / per-transition rules
| Rule | Example |
|---|---|
| Allowed transitions | `Internal Review → Client Review` or `→ Changes Requested` only |
| Required fields | `caption`, `media`, `scheduled_at` before Client Review |
| Required approval | Internal approval must be `APPROVED` to enter Client Review |
| Required assignee | Must have assignee in `Design` department |
| Required attachment | At least 1 media file |
| SLA | Max 48 business hours in Client Review → escalate |
| Notifications | Notify client approvers on entry |
| Automation | Fire workflow-builder triggers on entry/exit ([11](11-automation-engine.md)) |
| Permission requirements | Only `approvals.override` can move Client Review → Final Approval without client action |
| Entry/exit actions | Create approval request, lock editing, create task |

### Engine behavior
- Transition request → authorize → evaluate guards (all pure functions over entity snapshot; returns list of unmet requirements for UI) → apply in transaction → write state history + outbox events (`*.state_changed` with from/to) → side effects asynchronously.
- **Versioning:** editing a workflow creates a new version; existing items stay on their version until migrated via a mapping wizard (old state → new state). No item is ever in an undefined state.
- **State history** retained per entity (who, when, from, to, time-in-state) → cycle-time analytics.
- Templates: platform ships starter pipelines ("Simple Social", "Agency Standard", "Enterprise with Legal"); agencies clone & customize.

## 7.5 Milestones
Named dates with linked tasks/content; completion % ; can trigger billing (milestone invoices) and client notifications.

## 7.6 Discussions
Project-level threads (internal or client-visible flag, defaulting to internal); @mentions; attachments; realtime.

## 7.7 Data Ownership (`work` module; `workflow-engine` as separate module)
- `work`: `projects`, `project_members`, `project_milestones`, `tasks`, `task_assignees`, `task_watchers`, `task_dependencies`, `task_checklists`, `task_comments`, `task_attachments_refs`, `labels`, `task_labels`, `saved_views`, `discussions`, `discussion_messages`.
- `workflow-engine`: `workflow_definitions`, `workflow_versions`, `workflow_states`, `workflow_transitions`, `transition_guards`, `entity_state_history`. Exposes `WorkflowEnginePort` used by `work` and `social`.

## 7.8 Events
`project.created/updated/archived`, `project.health_changed`, `task.created`, `task.assigned`, `task.updated`, `task.state_changed`, `task.due_soon`, `task.overdue`, `task.commented`, `milestone.completed`, `workflow.published`, `entity.sla_breached`.

## 7.9 Acceptance Criteria
- An agency admin can create a 10-state content pipeline with guards in the UI, publish it, and use it immediately — no deploy.
- Kanban drop into a state with unmet guards is rejected with a list of missing requirements.
- Workflow edits never break existing items (version + migration mapping).
