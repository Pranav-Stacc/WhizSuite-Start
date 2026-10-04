# 04 — CRM, Clients & Brand Management

## 4.1 Lead & Sales Pipeline (CRM)
Social media agencies win clients through enquiries, referrals, and pitches. CRM is lightweight but agency-focused.

### Pipelines
- Multiple configurable pipelines (e.g. "Inbound", "Enterprise Pitch").
- Configurable stages, default: `New → Qualified → Discovery Call → Audit Sent → Proposal Sent → Negotiation → Won / Lost`.
- Stage properties: probability %, required fields, SLA (days in stage), automation hooks.

### Lead record
| Field | Notes |
|---|---|
| Company, brand name, website, industry | |
| Social handles | Used for **free social audit** generation |
| Contacts | Multiple, with role |
| Source | Website form, referral (referrer tracked), Instagram DM, event, outbound, ads |
| Estimated value (monthly retainer), currency | Pipeline forecasting |
| Owner | Sales/AM |
| Score | Configurable scoring rules (fit + engagement signals) |
| Next follow-up | Reminder → notification |
| Lost reason | Configurable list; required when moving to Lost |
| Custom fields | See [17](17-platform-features.md) |

### Activities
Notes, calls, meetings, emails (synced, see [18](18-integrations-and-api.md)), tasks, proposal views. Timeline per lead.

### Social Audit (SMMA-specific differentiator)
Enter prospect's public handles → system pulls public metrics where APIs allow (followers, posting frequency, engagement rate estimate, content mix) → generates branded audit PDF/link to attach to proposal. (Phase 4; depends on platform API access.)

### Conversion
`Lead → Won` → one-click **Convert to Client**: creates client, contacts, optional project from template, triggers onboarding SOP (see [11](11-automation-engine.md)), carries over activities and files.

## 4.2 Clients (Brands)
Each agency manages many clients. A client can have **multiple brands** (sub-brands) — modeled as `client_brands` for agencies serving groups (e.g. a conglomerate).

### Client profile
- Company information: legal name, display name, industry, website, address, GSTIN/tax ID, billing contact.
- Status: `ONBOARDING`, `ACTIVE`, `PAUSED`, `CHURNED`.
- Assigned Account Manager(s), team(s), workspace.
- Tier/segment (configurable).
- Start date, renewal date (linked to contract).
- Custom fields.

### Client sub-areas
```
Client
├── Overview (health, KPIs, upcoming, pending approvals)
├── Contacts & Client Users
├── Brand Kit
├── Social Accounts
├── Retainer & Deliverables
├── Projects & Campaigns
├── Content Calendar
├── Tasks
├── Files (Media Library scope)
├── Approvals
├── Feedback
├── Inbox (engagement)
├── Meetings
├── Reports & Analytics
├── Billing (proposals, contracts, invoices)
└── Activity & Audit
```

### Contacts vs Client Users
- **Contact:** a person record (name, email, phone, WhatsApp, role, decision-maker flag). No login.
- **Client User:** a contact who has been **invited to the portal** with a client role (Approver/Viewer). One contact → at most one client user per org.

## 4.3 Brand Kit (per client/brand)
Single source of truth used by creators, AI, and approvals:
- Logos (variants), colors (HEX/RGB/CMYK), fonts (files + names), imagery style references.
- **Brand voice & tone:** description, do's/don'ts, banned words, sample captions, emoji policy.
- **Hashtag sets** (named groups, e.g. "Brand core", "Diwali campaign").
- **Content pillars** (e.g. Education 30%, Product 25%, UGC 20%, Behind-the-scenes 15%, Promo 10%) with target mix — calendar shows actual vs target.
- Approved CTAs, links (UTM templates), legal disclaimers per platform.
- Competitors list (for benchmarking, [12](12-analytics-and-reporting.md)).
- Target audience personas.
Versioned; changes audited.

## 4.4 Retainers & Deliverables (SMMA-specific core)
Most SMMA revenue is **monthly retainers with deliverable quotas**.

- Retainer: client, period (monthly/quarterly), fee, currency, start/end, auto-renew, linked contract.
- **Deliverable quotas** per period, e.g.:
  | Deliverable | Qty / month |
  |---|---|
  | Instagram static posts | 12 |
  | Reels | 4 |
  | Stories | 20 |
  | LinkedIn posts | 8 |
  | Community management hours | 20 |
  | Monthly report | 1 |
- Deliverable types are configurable (map to content types/task types/time categories).
- **Live tracker:** planned / in-production / approved / published vs quota; over-delivery and under-delivery alerts (thresholds configurable).
- Rollover rules (configurable): unused carry forward / expire / bill extra.
- Overage pricing for extra deliverables → feeds invoicing ([14](14-finance-and-operations.md)).

## 4.5 Client Onboarding
- Onboarding checklist template per agency (configurable), e.g.: contract signed, invoice paid, brand kit collected, social access granted, kickoff scheduled, content strategy approved.
- **Access request flow:** client receives a portal link to connect their social accounts via OAuth themselves (no password sharing).
- Onboarding form (see [17](17-platform-features.md)) to collect brand info → auto-populates brand kit.

## 4.6 Client Health Score
Composite score 0–100 per client, recomputed by scheduled job + on relevant events. Weights configurable.

| Signal | Example metric |
|---|---|
| Payments | Overdue invoices, days late |
| Approvals | Median approval turnaround, pending count |
| Communication | Days since last client interaction, response time |
| Satisfaction | CSAT/NPS |
| Delivery | % deliverables on time vs quota |
| Performance | Social KPI trend vs goals |

Thresholds → `HEALTHY / AT_RISK / CRITICAL`; transitions emit `client.health_changed` → automations/notifications (e.g. "ABC may be at risk of churn"). AI explanation in Phase 4 ([16](16-ai-features.md)).

## 4.7 Client Satisfaction (CSAT / NPS)
- Surveys triggered by automation (after milestone, monthly, after report).
- Delivered in portal + email; results feed health score and reports.

## 4.8 Data Ownership
- `crm` module: `pipelines`, `pipeline_stages`, `leads`, `lead_contacts`, `lead_activities`, `lead_scores`.
- `clients` module: `clients`, `client_brands`, `client_contacts`, `client_assignments` (AMs/teams), `brand_kits`, `brand_assets_refs`, `hashtag_sets`, `content_pillars`, `onboarding_checklists`.
- `retainers` (inside `clients` initially; extractable): `retainers`, `retainer_deliverable_quotas`, `retainer_periods`.
- `client_users` are memberships in `access`; `clients` references them by ID only.
- `health` computed in `clients` (inputs consumed via events from finance/approvals/analytics).

## 4.9 Events
`lead.created`, `lead.stage_changed`, `lead.won`, `lead.lost`, `client.created`, `client.updated`, `client.status_changed`, `client.health_changed`, `brand_kit.updated`, `retainer.period_started`, `retainer.quota_at_risk`, `retainer.quota_exceeded`, `csat.submitted`.

## 4.10 Acceptance Criteria
- Converting a lead creates client + contacts + (optional) templated project + onboarding checklist in a single transaction + outbox events.
- Retainer tracker updates within seconds of content status change (event-driven).
- AM with CLIENT scope sees only assigned clients in all lists, search, calendar, and reports.
