# 05 — Social Media Publishing (Core Domain)

This is the heart of the product for social media agencies.

## 5.1 Model
```
Client → Social Account (OAuth connection) → Channel (page/profile/board/channel)
       → Campaign → Content Item (Post) → Platform Variants → Approval → Schedule → Publish → Analytics
```

## 5.2 Supported Platforms (phased)
| Platform | Channel types | Formats | Phase |
|---|---|---|---|
| Instagram (Graph API, Business/Creator) | Account | Feed image, carousel, Reel, Story, first comment, collab tag, product tags* | 4 (MVP social) |
| Facebook | Page | Text, image, video, Reel, Story, link | 4 |
| LinkedIn | Personal profile, Company page | Text, image, document (PDF carousel), video, poll* | 4 |
| X (Twitter) | Account | Post, thread, media | 4 (API cost permitting) |
| YouTube | Channel | Video, Short, title/description/tags/thumbnail/playlist | 4 |
| TikTok | Account | Video, photo mode | 4+ |
| Pinterest | Board | Pin, idea pin | 4+ |
| Google Business Profile | Location | Update, offer, event | 5 |
| Threads | Account | Text, media | 5 |

\* where API permits. **Platform capabilities are data, not code:** a `platform_capabilities` config (char limits, media counts, aspect ratios, durations, file sizes, supported features) drives composer validation and previews — updated without deploys.

## 5.3 Social Account Connection
- OAuth via integration framework ([18](18-integrations-and-api.md)); tokens encrypted (envelope encryption, KMS-ready), never sent to browser.
- Connected by agency staff **or** by the client via portal "Grant access" link (preferred, no password sharing).
- Token health monitor: refresh before expiry; on failure → `social_account.disconnected` → notify AM + client, mark channel `NEEDS_RECONNECT`, block scheduling with clear UI.
- Per-account permissions scoped via CLIENT scope.

## 5.4 Campaigns
- Belongs to a client (optionally a project). Name, objective (awareness/engagement/leads/sales), dates, budget, channels, KPIs/goals, hashtag set, UTM template, content pillars.
- Campaign board shows content items by stage; campaign calendar; campaign report.

## 5.5 Content Item (Post)
A **content item** is the unit of social work. It has:
- **Master content:** working title, brief, caption (rich text with variables), media, hashtags, mentions, link + UTM, content pillar, campaign, tags, custom fields.
- **Platform variants:** per selected channel, override caption/media/format/first comment/alt text/thumbnail/title (YouTube)/location/collaborators. Variants inherit from master until overridden.
- **Workflow state** from the agency's configured content pipeline ([07](07-projects-tasks-and-workflow-states.md)).
- **Linked tasks:** copywriting, design, video edit — auto-created from content template, assignees from roles/teams.
- **Versions:** every save of caption/media creates a version; approvals reference exact version ([08](08-approvals.md)).
- **Feedback threads** and annotations ([09](09-feedback-and-creative-review.md)).
- **Schedule:** date/time per variant (timezone-aware, defaulting to client timezone).
- **Retainer mapping:** counts toward deliverable quota by content type ([04](04-crm-and-clients.md)).

### Content types (configurable list, mapped to platform formats)
Static post, carousel, Reel/Short, Story, video, text-only, thread, document carousel, blog/newsletter (non-publishing, tracked), ad creative (tracked; pushed to ad accounts in Phase 5).

## 5.6 Composer
- Multi-channel composer with **live platform previews** (feed mock, Reel cover, Story frame, LinkedIn post) driven by capability config.
- Real-time validation: char counts, hashtag limits, media aspect/duration/size, link preview, required alt text (accessibility setting).
- Media from library ([10](10-media-library.md)), upload, Canva/Drive import ([18](18-integrations-and-api.md)).
- Caption tools: saved captions/snippets library, hashtag sets, emoji picker, mention lookup, **AI caption assist** using brand voice ([16](16-ai-features.md)), translation (Phase 5).
- First comment, collaborator tags, location, product tags (where supported).
- Link shortener with UTM builder (domain configurable; white-label short domain on Enterprise).
- Autosave + version history; presence indicators (who else is editing) via realtime.

## 5.7 Content Calendar
- Views: **Month, Week, Day, List/Agenda, Grid (Instagram feed preview)**.
- Filters: client, brand, channel, campaign, pillar, status, assignee, content type.
- Drag-and-drop rescheduling (permission + state-gated: e.g. cannot move `SCHEDULED` item without `social.schedule`).
- Color by status/pillar/channel (configurable).
- **Pillar mix indicator** vs brand kit targets; **retainer quota indicator** per client per month.
- Holidays/key dates overlay (country festival calendars, global days — configurable data sets; e.g. Diwali, Holi, Independence Day).
- **Monthly calendar approval:** send an entire month's plan to the client as one approval package (bulk approve/reject per item) — very common SMMA workflow.
- Shareable read-only calendar link (expiring, password optional) and ICS feed.

## 5.8 Scheduling & Publishing Engine
- When content reaches the configured "ready to schedule" state **and** required approvals are complete, it can be scheduled (state-machine guard).
- **Publishing modes:**
  - `AUTO_PUBLISH` — engine publishes via API at scheduled time.
  - `NOTIFY_PUBLISH` — for formats the API doesn't support; at time T, assigned user receives push with media + caption copy for manual posting, then marks as published (with URL).
- **Queue design (BullMQ):** delayed jobs per variant keyed by `variantId` (idempotent); rescheduling replaces the job; publish worker per platform with **rate limiting per platform/account** (config), retries with exponential backoff for transient errors, no retry for permanent errors (policy violation, invalid media).
- **Pre-flight checks** T-minus configurable (e.g. 30 min): token valid, media accessible, still approved, not paused → otherwise alert.
- **Statuses per variant:** `DRAFT`, `SCHEDULED`, `PUBLISHING`, `PUBLISHED`, `FAILED`, `CANCELLED`, `NEEDS_ATTENTION`.
- On success: store platform post ID + permalink → `social_post.published` event → analytics sync schedule, retainer tracker, notifications, automation triggers.
- On failure: `social_post.failed` with normalized error code + human message → notify assignee/AM; one-click retry.
- **Global & per-client pause** ("crisis mode"): instantly halts all scheduled posts for a client; audited.
- **Queues / evergreen (Phase 5):** recurring time slots per channel and evergreen content recycling.
- **Best time to post (Phase 4/5):** per-channel recommendation from historical engagement.

## 5.9 Link in Bio (Phase 5)
Hosted, branded link-in-bio page per client (custom domain capable) with links mapped to published posts; click analytics.

## 5.10 Data Ownership (`social` module)
`social_accounts`, `social_channels`, `platform_capabilities` (config), `campaigns`, `content_items`, `content_variants`, `content_versions`, `content_media_refs`, `caption_snippets`, `publish_jobs`, `publish_attempts`, `short_links`.
Social account credentials live in `integrations` (`integration_credentials`); `social` references by ID.

## 5.11 Events
`social_account.connected`, `social_account.disconnected`, `campaign.created`, `content.created`, `content.updated`, `content.version_created`, `content.state_changed`, `content.scheduled`, `content.rescheduled`, `social_post.publishing`, `social_post.published`, `social_post.failed`, `client.publishing_paused/resumed`.

## 5.12 Acceptance Criteria
- A post scheduled for 10:00 IST publishes within configurable tolerance (default ±60 s) at p99 under nominal load.
- A post cannot be published if its approved version differs from the current version (re-approval required, configurable per workflow).
- Rescheduling or cancelling never results in a duplicate publish (idempotency key per variant + platform check).
- Disconnected accounts block scheduling with a clear reconnect CTA and notify the right people.
