# 09 — Feedback & Creative Review

Contextual, visual feedback replaces "please change the logo" WhatsApp messages.

## 9.1 Supported Media & Annotation Types
| Media | Annotation |
|---|---|
| Image (JPG/PNG/WebP/GIF) | Point pins (x%, y%), rectangle/area, freehand draw, arrow |
| Carousel | Per-slide pins |
| Video (MP4/MOV) | Timestamp comments (single time or range), frame-accurate pins on paused frame, drawing on frame |
| PDF / documents | Page + region highlight, text selection comments |
| Caption / copy | Inline text-range comments, suggested edits (track-changes style) |
| Story / Reel previews | Frame/time-based pins on preview mock |
| Website/URL (Phase 5) | Screenshot capture + pins |

Coordinates stored **relative** (percentages / normalized time) so annotations survive responsive rendering and transcoded renditions.

## 9.2 Feedback Threads
- Each annotation starts a thread: comments, replies, @mentions (internal and client), attachments, reactions.
- **Visibility:** `INTERNAL` (agency only) or `CLIENT_VISIBLE`. Client users only ever see client-visible threads. Default visibility configurable per org; internal notes visually distinct.
- **Status:** `OPEN`, `RESOLVED`, `REOPENED`, `WONT_FIX`. Resolving requires permission `feedback.resolve`; client can reopen.
- Threads are bound to a **file/content version**; on new version upload, open threads can be carried forward (shown as "from v2") or resolved in bulk.
- **Version compare:** side-by-side and overlay slider (images), synced playback (video).
- Feedback → task: convert a thread (or all open threads) into revision task(s) assigned to the creator.

## 9.3 Feedback Rounds & Metrics
- Each "changes requested" cycle increments **revision round** on the content item.
- Configurable **revision limits** per retainer/contract (e.g. 2 free rounds) → over-limit warning → optional billable revision (feeds finance).
- Metrics: rounds per item, time-to-resolve, feedback volume per client.

## 9.4 Client Experience
- Simple review screen in portal: media viewer + click-to-comment + approve/request changes buttons side by side (integrated with [08](08-approvals.md)).
- No account needed for one-off external reviewers? → Only via **guest review links** (expiring, name+email captured, optional OTP); actions attributed and audited. Plan-gated.

## 9.5 Realtime
Live cursor/pins presence and new comments appear instantly for all viewers (WebSocket rooms per file version).

## 9.6 Data Ownership (`feedback` module)
`feedback_threads`, `feedback_annotations` (type, geometry JSON, time range, page, version ref), `feedback_comments`, `feedback_mentions`, `feedback_reactions`, `guest_reviewers`.

## 9.7 Events
`feedback.thread_created`, `feedback.comment_added`, `feedback.mentioned`, `feedback.resolved`, `feedback.reopened`, `feedback.round_incremented`, `feedback.revision_limit_reached`.

## 9.8 Acceptance Criteria
- Pins render at the correct position across screen sizes and across image renditions.
- Video timestamp comments seek playback to the exact time (±1 frame where codec allows).
- Client never sees internal threads — verified by API tests at the serializer/authorization level.
