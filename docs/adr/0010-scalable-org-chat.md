# ADR 0010: Scalable organization chat

- Status: Accepted
- Date: 2026-10-10

## Context

The engagement inbox modelled platform social comments/DMs (`inbox_conversations` /
`inbox_messages`). Product needs first-party WhatsApp-style messaging for staff and
clients: DMs, permissioned groups, media, link previews, and cross-feature mentions
(tasks, posts, calendar events, clients). That is a different domain from community
management and must scale to high message volume with instant room-list loading.

## Decision

1. **Remove the engagement inbox domain entirely** (schema, API, web, mobile, contracts,
   permissions, events). Social community inbox, if revived later, is a separate product.
2. **Own chat in a `chat` Postgres schema** with:
   - `chat_rooms` â€” `DM` | `GROUP` | `CLIENT`; denormalized `last_message_at`,
     `last_message_preview`, `member_count` for O(1) room-list rows
   - `chat_room_members` â€” role + capability flags + read cursors; membership is the
     authorization boundary for room access
   - `chat_messages` â€” idempotent `client_message_id`, soft delete, reply threading
   - `chat_attachments`, `chat_mentions`, `chat_reactions` â€” side tables so message rows
     stay narrow for hot-path reads
3. **Access:** org permissions `chat.view` / `chat.send` / `chat.create_room` /
   `chat.manage`; fine-grained post/add/manage flags per membership. CLIENT rooms are
   scoped to the brand; portal principals only see rooms they belong to for their client.
4. **Realtime:** Socket.IO rooms `org:{orgId}:chat:{roomId}`; events for message CRUD,
   typing, and read receipts. List badges use membership unread derived from
   `last_read_message_id` vs room `last_message_id`.
5. **Scale path:** cursor pagination on `(created_at DESC, id DESC)`; future table
   partitioning by time and Socket.IO Redis adapter without changing the public contract.

## Consequences

- Client portal brand messaging moves onto `CLIENT` chat rooms (feedback remains for
  content annotation threads only).
- Automations trigger `inbox.negative` is removed with the inbox domain.
- Message search / full-text and link-unfurl workers can be added later without schema
  rewrites (preview JSON + attachment metadata already present).
