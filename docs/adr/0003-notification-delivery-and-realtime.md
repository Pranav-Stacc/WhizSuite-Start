# ADR 0003: Multi-channel notification delivery and authenticated realtime

- Status: Accepted
- Date: 2026-10-09

## Context

Notifications were in-app rows only. The mobile app needs push, users need email, and open
sessions should update live. The realtime gateway accepted anonymous sockets from any origin.

## Decision

- The notifications domain maps domain events to a recipient, resolves per-type channel
  preferences (`inApp`, `email`, `push`; defaults from `NOTIFICATION_DEFAULT_CHANNELS`), persists one
  `Notification` plus a `NotificationDelivery` per channel, and enqueues one BullMQ job per delivery
  (`notifications.delivery`). Attempts, backoff, concurrency and failed-job retention come from config;
  exhausted jobs stay in BullMQ's failed set (dead letter) and are logged at error level.
- Channels implement `NotificationChannelAdapter`; only adapters talk to providers:
  - `inApp` emits `notification.created` over Socket.IO to the recipient's tenant-qualified room;
  - `email` uses the shared `EmailService` with server-side templates (`config/notification-templates.ts`);
  - `push` sends through the `PushProvider` port, implemented by FCM (`firebase-admin`), which is
    initialised only when `PUSH_ENABLED=true` and the `FCM_*` credentials validate at startup.
    Tokens FCM reports as invalid are deleted.
- Devices register via `POST /v1/organizations/:org/notifications/devices`; tokens are globally
  unique and move to the latest user; each user keeps at most `DEVICES_PER_USER_MAX` devices.
- The realtime gateway (`/realtime`) requires the access JWT in `auth.token` (or a Bearer header) and
  joins `org:{orgId}` and `org:{orgId}:user:{userId}`; CORS comes from `CORS_ORIGINS` via a
  configured Socket.IO adapter. Other modules publish only through `RealtimeService`.

## Consequences

- BullMQ requires Redis ≥ 5.
- Realtime emits are per process; running several API instances will need the Socket.IO Redis adapter.
- When in-app is disabled for a type, the row is stored already read so other channels still have a
  delivery record.
