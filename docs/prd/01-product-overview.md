# 01 — Product Overview

## 1.1 Vision
**Agency OS for Social Media Agencies** — the operating system that runs a social media management agency end to end: winning the client, onboarding them, planning content, producing creatives, getting internal and client approvals, scheduling and publishing, managing community engagement, reporting results, and billing — in one multi-tenant, white-labelable platform.

> Positioning: *"The operating system for modern social media agencies."*
> Mental model: ClickUp + Frame.io + Hootsuite/Sprout + HubSpot-lite + client portal + workflow automation — built specifically for agencies that manage social media for multiple brands.

## 1.2 Problem Statement
Social media agencies today stitch together 6–10 tools:

| Need | Typical tool | Pain |
|---|---|---|
| Task/project tracking | ClickUp, Asana, Trello | Not aware of posts, platforms, or approvals |
| Creative review | Frame.io, Google Drive comments, WhatsApp | Feedback scattered, no version history |
| Content calendar | Google Sheets, Notion | Manual, disconnected from publishing |
| Scheduling | Buffer, Hootsuite, Meta Business Suite | No agency workflow, weak client approval |
| Client communication | WhatsApp, email | No audit trail, approvals lost |
| Reporting | Manual screenshots, Canva, Looker | Hours per client per month |
| Billing | Excel, Zoho, Tally | Disconnected from deliverables and retainers |

Results: missed deadlines, lost approvals, "who approved this?" disputes, unbilled work, under-delivered retainers, and senior staff spending 30–40% of time on coordination.

## 1.3 Core Value Pillars
1. **Configurable content pipeline** — each agency defines its own stages (Brief → Copy → Design → Internal Review → Client Review → Scheduled → Published) without custom development.
2. **Granular data scopes** — RBAC + resource-level scopes; an Account Manager sees only their assigned clients.
3. **Client portal** — clients approve content, give contextual feedback, and see results without seeing agency internals.
4. **Approval & creative review engine** — versioned, auditable approvals with image annotations, video timestamps, and PDF comments.
5. **Publish + engage + report** — native scheduling, team & client chat, and automated white-labeled reports.
6. **Retainer intelligence** — track deliverables against retainer quotas (e.g. "12 posts + 4 reels / month"), profitability, and team capacity.

## 1.4 Target Customers
- **Primary:** Social media management agencies (5–200 staff) managing 5–200 client brands.
- **Secondary:** Digital marketing agencies with a social practice; freelancer collectives; in-house brand teams managing multiple sub-brands.
- **Geography:** India first (INR pricing, GST invoicing, WhatsApp-heavy communication, DPDP Act compliance), then global.

## 1.5 Personas

| Persona | Goals | Key features |
|---|---|---|
| **Agency Owner / Founder** | Growth, profitability, client retention | Dashboards, profitability, client health, billing, CRM |
| **Agency Admin / Ops** | Smooth operations, permissions, onboarding | Workspace settings, roles, templates, SOP automation |
| **Account Manager (AM)** | Keep clients happy, deliver on retainer | Client view, approvals, reports, retainer tracker, chat |
| **Social Media Manager / Strategist** | Plan and ship content calendar | Content calendar, composer, campaigns, analytics |
| **Copywriter** | Write captions on time | Task queue, caption editor, brand voice, AI assist |
| **Designer / Video Editor** | Produce creatives, handle revisions | Task queue, creative review, versions, media library |
| **Community Manager** | Respond to comments/DMs within SLA | Unified inbox, saved replies, assignment, sentiment |
| **Freelancer / Contractor** | Do assigned work only | Restricted scoped access |
| **Client Approver** (external) | Approve quickly, see progress | Client portal, mobile approvals, annotations |
| **Client Viewer** (external) | See results | Portal reports, calendar view |

## 1.6 Hierarchy (conceptual)
```
Platform (SaaS)
└── Organization (Agency)  ← hard tenant boundary
    ├── Workspaces (e.g. "Mumbai Office", "Enterprise Accounts")
    ├── Departments (nested) → Designations
    ├── Teams (many-to-many with members)
    ├── Locations
    ├── Clients (Brands)
    │   ├── Contacts / Client Users
    │   ├── Brand Kit
    │   ├── Social Accounts
    │   ├── Retainers
    │   └── Projects / Campaigns
    │       ├── Content (Posts) & Tasks
    │       ├── Approvals & Feedback
    │       └── Files
    └── Settings, Workflows, Automations, Billing
```
Every agency is **completely isolated** from every other agency (see [02](02-tenancy-and-workspace.md)).

## 1.7 Competitive Landscape

| Competitor | Strength | Gap we exploit |
|---|---|---|
| Hootsuite / Sprout Social | Publishing, inbox, analytics | Weak project/workflow, no agency ops, expensive |
| Buffer / Later | Simple scheduling | No approvals depth, no agency management |
| Planable | Content approval | No PM, CRM, billing, capacity |
| ClickUp / Monday | Flexible PM | Not social-aware, no publishing, no client portal |
| Frame.io | Creative review | Video-only focus, no publishing/PM |
| Agency Analytics | Reporting | Reporting only |
| SocialPilot / Vista Social | Affordable agency scheduling | Shallow workflow, RBAC, finance |

**Differentiator:** the only platform where the *agency-defined pipeline*, *scoped permissions*, *approval/feedback engine*, *publishing*, and *retainer economics* are one connected system.

## 1.8 Success Metrics (North Star + KPIs)
- **North Star:** Posts published through an approved workflow per week (across all tenants).
- **Activation:** Agency connects ≥1 social account, invites ≥2 team members, and publishes ≥1 approved post within 7 days.
- **Engagement:** WAU/MAU ≥ 60% for internal users; ≥ 40% of client approvers act within portal (vs email).
- **Efficiency (customer outcome):** Median approval turnaround reduced by 50% vs baseline in onboarding survey.
- **Retention:** Logo churn < 3%/month; NRR > 110%.
- **Revenue:** ARPA growth through seat + client expansion and plan upgrades.

## 1.9 Product Principles
1. Agency-configurable over opinionated — states, fields, roles, automations, templates, branding.
2. Backend decides permissions; UI only reflects them.
3. Everything auditable.
4. Clients see a simple, branded experience — never agency internals.
5. Ship a lovable MVP; phase the rest (see [22](22-roadmap-and-mvp.md)).
6. Nothing hardcoded: limits, plans, TTLs, platform rules, and business rules are configuration.

## 1.10 Out of Scope (for now)
- Full HRMS/payroll (only leave/availability for capacity).
- Full accounting ledger (integrate with Tally/Zoho/QuickBooks instead).
- Building our own video conferencing (integrate Google Meet/Zoom/Teams).
- Agency-to-agency marketplace (Phase 6+ exploration).
