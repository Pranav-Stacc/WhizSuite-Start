# 06 — Organization Chat

> Replaces the former engagement inbox PRD. First-party messaging for staff and clients.

## 6.1 Scope

- Direct messages between members
- Permissioned group rooms
- Client brand rooms (agency ↔ client portal)
- Text, media attachments, link previews
- Mentions of users and cross-feature entities (clients, tasks, projects, content, calendar events, leads)
- Reactions, reply threads, read receipts, typing indicators

## 6.2 Room model

| Type | Purpose |
|------|---------|
| `DM` | Exactly two members; unique per user pair (`dm_key`) |
| `GROUP` | Named multi-member room with roles |
| `CLIENT` | One primary room per client brand |

Membership roles: `OWNER`, `ADMIN`, `MEMBER`, `GUEST` with capability flags `canPost`, `canAddMembers`, `canManage`.

## 6.3 Permissions

- `chat.view` — list/read rooms the user belongs to
- `chat.send` — send messages where membership allows
- `chat.create_room` — create GROUP / CLIENT rooms and DMs
- `chat.manage` — org-level moderation / archive

Client-scoped principals only access CLIENT rooms for their brand (plus membership).

## 6.4 Scale

- Denormalized room list fields for instant sidebar load
- Cursor pagination on messages `(created_at, id)`
- Idempotent sends via `client_message_id`
- Realtime fan-out via Socket.IO room channels
- Side tables for attachments/mentions/reactions

## 6.5 Events

`chat.message_created`, `chat.message_updated`, `chat.room_updated`, `chat.member_mentioned`

## 6.6 Out of scope

Platform social comment aggregation (Instagram/Facebook community management) — separate future product if needed.
