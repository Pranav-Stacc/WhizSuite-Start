# 06 — Unified Engagement Inbox (Community Management)

Community management is a billable SMMA service. The inbox makes it measurable.

## 6.1 Scope
Aggregates, per client, from connected channels (where APIs permit):
- Comments on posts/Reels/videos (Instagram, Facebook, LinkedIn, YouTube, TikTok)
- Direct messages (Instagram, Facebook Messenger; WhatsApp Business in Phase 5)
- Mentions and tags
- Reviews (Google Business Profile, Facebook — Phase 5)

## 6.2 Conversation Model
```
Channel → Conversation (thread: DM or comment thread on a post) → Messages
```
- Conversation fields: client, channel, type (`COMMENT`, `DM`, `MENTION`, `REVIEW`), author (platform user handle), linked post, status, assignee, priority, labels, sentiment, SLA due, first-response time, resolution time.
- Statuses: `NEW`, `OPEN`, `PENDING` (waiting on client/internal), `RESOLVED`, `SPAM`. Configurable labels.

## 6.3 Features
- **Unified view** with filters: client, channel, type, status, assignee, label, sentiment, SLA breach, unanswered.
- **Assignment:** manual, round-robin, or rule-based (automation) to community managers; collision detection (realtime "X is replying").
- **Reply** from inbox via platform API; like, hide, delete (permission `inbox.moderate`).
- **Saved replies** per client with variables (`{first_name}`) and brand-voice AI suggestions ([16](16-ai-features.md)).
- **Internal notes** & @mentions on a conversation (never sent to platform).
- **Escalation to client:** route a sensitive comment to the client approver in portal for guidance (e.g. complaints, legal) — response captured and audited.
- **Sentiment & intent tagging** (AI, Phase 4): positive/neutral/negative; intents like `PURCHASE_INTENT`, `COMPLAINT`, `QUESTION`, `SPAM`.
- **Keyword rules:** auto-label, auto-hide (profanity/spam lists per client), auto-assign, alert on crisis keywords.
- **SLA policies** per client (e.g. first response within 2 business hours) — configurable business hours per client timezone; breach → notification + automation trigger.
- **Contact profile:** platform user history across conversations; link to CRM contact/lead (social-sourced lead capture).

## 6.4 Sync Architecture
- Webhooks from platforms where available (Meta webhooks) → ingestion endpoint (signature-verified) → queue → normalize → store.
- Polling fallback jobs with per-platform rate-limit budgets (configurable intervals).
- Idempotent ingestion keyed by `(channel_id, platform_message_id)`.
- Outbound replies through publish-like queue with retries.

## 6.5 Metrics (feed [12](12-analytics-and-reporting.md))
Volume by channel/type, median first response time, resolution time, SLA compliance %, sentiment trend, responses per agent, hours logged (via time tracking).

## 6.6 Data Ownership (`engagement` module)
`inbox_conversations`, `inbox_messages`, `inbox_assignments`, `inbox_labels`, `saved_replies`, `sla_policies`, `keyword_rules`, `social_contacts`.

## 6.7 Events
`inbox.message_received`, `inbox.conversation_assigned`, `inbox.reply_sent`, `inbox.sla_breached`, `inbox.crisis_keyword_detected`, `inbox.conversation_resolved`.

## 6.8 Acceptance Criteria
- New comments appear in inbox within 60 s (webhook path) / within configured poll interval (fallback).
- No duplicate messages under webhook redelivery.
- Community manager with CLIENT scope sees only assigned clients' conversations.
