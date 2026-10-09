# ADR 0008 — Unified calendar feed (scoped federation)

## Status
Accepted

## Context
The org calendar must show everything date-relevant — not only manually created
items — and respect tenant / client data scope: scheduled posts, task dues,
shoots, pending approvals, campaign windows, invoice dues, project milestones,
and meetings. PRD 17.4 describes a projection table; full event-driven projection
is not required for a correct UX today.

## Decision
1. **`GET …/calendar/feed?from=&to=&clientId=`** returns a unified
   `CalendarFeedItem[]` for the visible range.
2. The feed **federates at read time** via owning module services (content,
   work, approvals, finance, stored `calendar_items`), filtered by
   `TenantContext.clientScope()` and optional `clientId`.
3. Source types are explicit (`CONTENT`, `TASK`, `SHOOT`, `APPROVAL`,
   `CAMPAIGN`, `INVOICE`, `MILESTONE`, `MEETING`, `MANUAL`, `DEADLINE`) so the
   UI can layer-toggle.
4. Event-driven write-into-`calendar_items` remains the long-term path; the feed
   may prefer stored rows when a source already projected them (e.g. shoots) and
   still merge live sources that are not projected yet.

## Consequences
- Web / mobile calendars call the feed (or merge equivalently) instead of
  inventing parallel aggregations.
- Adding a new dated domain means a thin map in the feed service + a source type.
- Heavy orgs may later swap federation for projections without changing the DTO.
