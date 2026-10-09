# 15 — Notification Engine

Centralized, event-driven, multi-channel. No module sends emails/push directly.

## 15.1 Flow
```
Domain Event → Notification Engine
   → Resolve recipients (rules + watchers + mentions + assignees + scopes)
   → Apply preferences, quiet hours, grouping/digest, plan entitlements
   → Render template per channel + locale + branding
   → Dispatch via channel adapters (queue per channel)
   → Track delivery/read status
```

## 15.2 Channels (pluggable `NotificationChannelPort` adapters)
| Channel | Provider examples | Phase |
|---|---|---|
| In-app (bell + realtime) | Native (WebSocket) | 1 |
| Email | AWS SES / Postmark / SendGrid / Resend (config-selected) | 1 |
| Web push / PWA push | Web Push (VAPID) | 3 |
| Mobile push | FCM / APNs | 5 |
| Slack / Microsoft Teams | Via integrations | 3–4 |
| WhatsApp (templates) | WhatsApp Business Cloud API / BSP | 5 |
| SMS | MSG91 / Twilio (OTP, critical alerts) | 5 |
| Webhook | Customer endpoints | 5 |

## 15.3 Notification Types (catalog, configurable)
Each type has: key (e.g. `task.assigned`), category (Work, Approvals, Content, Inbox, Clients, Finance, System, Marketing), default channels, priority (`LOW`, `NORMAL`, `HIGH`, `CRITICAL`), groupable flag, digestible flag, client-facing flag, templates per channel/locale.

Examples:
| Event | Default |
|---|---|
| Task assigned | Push + In-app |
| Approval requested | Email + Push + In-app |
| @mention | Push + In-app |
| Content publish failed | Push + Email + In-app (CRITICAL) |
| Social account disconnected | Email + In-app (HIGH) |
| Inbox SLA breached | Push + In-app |
| Invoice overdue | Email |
| Weekly summary | Email digest |
| Product/marketing updates | Off by default |

## 15.4 User Preferences
- Matrix: notification type/category × channel (on/off), with org-level defaults and **org-enforced** mandatory types (e.g. security alerts).
- **Quiet hours** (per user, timezone-aware) — non-critical notifications held until window ends; CRITICAL bypass configurable.
- **Digests:** instant / hourly / daily / weekly per category.
- Per-entity mute/follow (watch a project, mute a thread).
- Client users have a simplified preference screen.

## 15.5 Features
- **@mentions** across comments, feedback, discussions, and chat.
- **Grouping/batching:** "5 new comments on Post #27" within a configurable window (debounce via Redis key per `(user, group_key)`).
- Read/unread, mark all read, archive; unread counts cached in Redis.
- Deep links to the exact entity (and annotation/timestamp).
- Email: branded per agency, sender per domain verification, unsubscribe headers (List-Unsubscribe), bounce/complaint handling → suppression list.
- Delivery logs per notification per channel (status: queued, sent, delivered, opened, failed, suppressed).

## 15.6 Reliability
- Triggered from outbox-relayed events (no notification for uncommitted changes).
- Idempotency key `(event_id, recipient_id, channel)`.
- Per-channel queues with retries/backoff and rate limits (config); DLQ + alerting.
- Provider failover (secondary email provider) — config.

## 15.7 Data Ownership (`notifications` module)
`notification_types`, `notification_templates`, `notifications`, `notification_deliveries`, `notification_preferences`, `notification_org_defaults`, `quiet_hours`, `digest_queue`, `push_subscriptions`, `email_suppressions`.

## 15.8 Acceptance Criteria
- In-app notification appears < 2 s after triggering event (p95).
- A user with Approval → Email only receives no push for approvals.
- Quiet hours hold non-critical notifications and release them as a grouped summary.
