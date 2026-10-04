# 13 — Client Portal & White-Label

Clients must never need to understand the agency's internal system. Completely different, simplified, branded experience.

## 13.1 Access
- Separate route group (`/portal`) and optionally separate domain (`clients.agency.com`) — resolved to tenant via domain mapping.
- Client users (membership type `CLIENT_USER`) can **only** access portal routes; internal routes return 404 for them.
- A client user may belong to multiple clients of the same agency (e.g. group marketing head) → client switcher.

## 13.2 Portal Dashboard
```
ACME AGENCY (agency logo/colors)

Good morning, Nike 👋
─────────────────────────
Pending approvals      3   [Review now]
Upcoming posts         12  (this week)
Active campaigns       2
Latest report          Oct 2026 [View]
─────────────────────────
Content calendar (month/week)
Recent files
Messages
```

## 13.3 Portal Modules
| Module | Client can |
|---|---|
| Dashboard | See summary, act on pending items |
| Approvals | Approve, reject, request changes, bulk-approve calendar packages |
| Content Calendar | View planned/scheduled/published content (client-visible states only; internal states mapped to client-friendly labels, configurable) |
| Creative Review | Annotate images/videos/PDFs, comment, reopen feedback |
| Projects / Campaigns | View progress, milestones, deadlines (client-visible tasks only) |
| Files | View/download shared files, upload assets (brand assets, raw footage) into designated folders |
| Messages | Threads with agency team (client-visible discussions) |
| Meetings | Upcoming meetings, join links, notes shared by agency |
| Reports | View live/archived reports, download PDF |
| Requests | Submit new requests/briefs via agency forms (creates tasks/projects via automation) |
| Billing (optional per client) | View proposals, sign contracts, view/pay invoices |
| Social access | Connect/reconnect social accounts via OAuth |
| Feedback & CSAT | Respond to surveys |
| Settings | Profile, notification preferences, language |

## 13.4 Visibility Rules
- Every internal entity has an explicit **client visibility** dimension (`INTERNAL` default, `CLIENT_VISIBLE`); content/state visibility mapped per workflow state.
- Portal API is a **separate set of endpoints/serializers** (BFF) returning only client-safe fields — never internal costs, internal comments, team utilization, or other clients.
- Authorization still enforced by the same engine with CLIENT scope.

## 13.5 Client Notifications
Branded emails (agency sender/domain), push (PWA/mobile), digest options; approve-from-email magic links ([08](08-approvals.md)).

## 13.6 White-Label
| Level | What changes |
|---|---|
| Basic (all plans) | Agency logo + colors in portal and emails |
| Pro (Growth) | Custom portal domain, custom email sender domain, custom email templates, hide "Powered by" in portal |
| Full (Enterprise) | Custom app domain for internal app too, custom login page, favicon, PWA name/icon, custom short-link domain, link-in-bio domain, platform fully invisible |

Theme tokens (colors, radius, fonts) stored per org → applied server-side as CSS variables (no flash), cached and invalidated on `branding.updated`.

## 13.7 Mobile
- Portal is a responsive PWA from day one (installable, push notifications).
- Native mobile apps (employee + client) in Phase 5 sharing the same API/BFF.

## 13.8 Acceptance Criteria
- A client user cannot reach any internal endpoint or see any internal field (automated contract tests on portal serializers).
- Portal renders fully branded on custom domain with valid TLS and no platform branding (Enterprise).
- Approve flow works end-to-end on mobile with ≤ 3 taps per item.
