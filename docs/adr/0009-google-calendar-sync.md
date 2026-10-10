# ADR 0009 — Google Calendar sync (opt-in per event)

## Status
Accepted

## Context
PRD 17.4 / 18 call for Google Calendar two-way sync (Phase 4). Users need to
choose which agency events appear on Google — not every federated feed item
(content, tasks, invoices) should be pushed blindly.

## Decision
1. OAuth lives under integrations (`google_calendar` provider); calendar module
   owns `calendar_connections` settings and sync jobs.
2. Stored `calendar_items` (manual, meeting, deadline, shoot) carry
   `sync_to_google` + optional `external_event_id`. Federated live layers are
   never auto-pushed.
3. Outbound sync is opt-in per event (or org default for *new* stored items).
   Inbound pull creates/updates `MEETING` projections keyed by external id.
4. Permissions: `calendar.view|create|edit` for the product surface;
   `calendar.sync` to connect/disconnect and change sync settings.
5. Tenant/client scope is enforced on create/update and before outbound push.

## Consequences
- Connect Google from `/calendar`; create/edit flows expose a sync checkbox
  when connected.
- BullMQ `calendar-sync` queue performs API calls asynchronously.
- Outlook can reuse the same connection + flag model later.
