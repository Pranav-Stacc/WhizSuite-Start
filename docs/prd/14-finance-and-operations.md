# 14 — Finance & Agency Operations

Proposals, contracts, invoicing, time tracking, capacity planning, and profitability.

## 14.1 Proposals & Quotations
- **Proposal builder:** templates, drag-and-drop sections (about us, social audit, strategy, scope, deliverables, packages, pricing, timeline, case studies, terms), agency branding.
- **Service catalog:** configurable services/packages (e.g. "Instagram Growth — 12 posts + 4 reels"), unit prices, tax rates, discounts, optional add-ons the client can toggle.
- Send as tracked link: opens, time spent per section, view count ("Client opened proposal 4 times") → notifications/automation.
- Client can comment, select options, accept with **e-signature** (typed/drawn + IP/timestamp evidence; integrate DocuSign/Zoho Sign/Leegality optionally).
- On accept (automation): create client (if lead) → contract → retainer with deliverable quotas → first invoice → project from template.
- States: `DRAFT`, `SENT`, `VIEWED`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `REVISED`.

## 14.2 Contracts
- Templates: NDA, MSA, SOW, Retainer agreement, Influencer agreement; variables merged from client/proposal.
- Versioning, redlines via comments, e-signature, signed PDF stored immutably (hash recorded).
- Start/end dates, renewal type (auto/manual), notice period → **renewal reminders** (e.g. 30 days before expiry → notify AM, create renewal task, email client).
- States: `DRAFT`, `SENT`, `SIGNED`, `ACTIVE`, `EXPIRING`, `EXPIRED`, `TERMINATED`, `RENEWED`.

## 14.3 Invoicing (client billing by agencies)
- Invoice types: one-time, **recurring retainer**, milestone, hourly (from approved time), expense re-bill, overage (extra deliverables / extra revision rounds), ad-spend management fee (% of spend).
- Line items, taxes (**GST: CGST/SGST/IGST by place of supply**, HSN/SAC codes; VAT/sales tax configurable for other regions), discounts, credit notes, partial payments, multi-currency with FX rate snapshot.
- Numbering sequences configurable per org (prefix, FY reset) — gap-free via DB sequence per org + FY.
- Branded PDF, send via email/portal, payment link (Razorpay/Stripe; provider pluggable).
- Payment tracking: manual record or gateway webhook (`invoice.paid`), reconciliation status.
- Reminders schedule (configurable) for upcoming/overdue.
- Export/sync to accounting (Tally, Zoho Books, QuickBooks, Xero) via integrations ([18](18-integrations-and-api.md)).
- States: `DRAFT`, `SENT`, `VIEWED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `VOID`.
- Money stored as integer minor units + currency code.

### Financial dashboard
Revenue (period), outstanding, overdue, expected (scheduled recurring + pipeline weighted), MRR from retainers, churned MRR.

## 14.4 Expenses
Record expenses per client/project (software, freelancers, stock assets, shoot costs, ad spend if paid by agency), billable flag, receipt upload, approval.

## 14.5 Time Tracking
- Start/stop timer (one active per user), manual entries, weekly timesheets.
- Linked to task / content / project / client / chat room; billable vs non-billable; activity category (configurable).
- Timesheet submission & approval (`time.approve`); lock periods.
- Internal **cost rate** per member (or per designation) and **bill rate** per client/service — both configurable, effective-dated.
- Idle reminders and missing-timesheet reminders (automation).

## 14.6 Resource & Capacity Planning
- Member capacity: working hours per day from location/schedule, minus leave & holidays.
- Allocation: task estimates + scheduled content production effort (configurable effort per content type, e.g. Reel = 4h edit + 1h copy).
- **Workload view** (heatmap per person per day/week): `Rahul 112%` → reassign via drag-and-drop.
- Skills tagging on members; filter by skill/department/designation when assigning.
- Leave management (lightweight): leave types, requests, approvals, calendar → affects capacity.
- Forecasting: upcoming retainer deliverables × effort → projected demand vs capacity per department (Phase 4/5).

## 14.7 Profitability
Per client / project / retainer period:
```
Client: ABC
Revenue          ₹5,00,000
Team cost        ₹1,80,000   (time × cost rate)
Software cost    ₹25,000     (allocated, configurable method)
Freelancers      ₹40,000
Ad spend (if borne) ₹1,00,000
──────────────────────────
Gross profit     ₹1,55,000
Margin           31%
```
Also: effective hourly rate, retainer over-servicing (hours spent vs hours budgeted), margin trend. Visible only with `clients.financials.view`.

## 14.8 Data Ownership
- `finance` module: `service_catalog`, `proposals`, `proposal_sections`, `proposal_items`, `proposal_views`, `contracts`, `contract_versions`, `signatures`, `invoices`, `invoice_items`, `invoice_sequences`, `payments`, `credit_notes`, `expenses`, `tax_rates`.
- `time` module: `time_entries`, `timers`, `timesheets`, `cost_rates`, `bill_rates`.
- `capacity` module (initially inside `time`): `member_schedules`, `leave_types`, `leave_requests`, `holiday_calendars`, `member_skills`, `effort_estimates`.

## 14.9 Events
`proposal.sent/viewed/accepted/declined`, `contract.signed/expiring/expired`, `invoice.created/sent/viewed/paid/overdue`, `payment.received`, `time_entry.created`, `timesheet.submitted/approved`, `capacity.overallocated`, `leave.approved`.

## 14.10 Acceptance Criteria
- Accepting a proposal creates contract + retainer + invoice + project per configured automation, atomically from the finance side with events for the rest.
- GST invoices are compliant (fields, tax split by place of supply) and numbering is gap-free.
- Profitability numbers reconcile with sum of time entries × effective-dated cost rates.
