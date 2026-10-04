# 18 — Integrations Framework, Public API & Marketplace

## 18.1 Integration Framework
Integrations are **plugins**, never hardcoded into core modules.
```
Integration Provider (definition: code adapter + manifest)
├── Auth (OAuth2 / API key / webhook secret)
├── Credentials (encrypted, per org/client connection)
├── Inbound webhooks (signature verification, idempotent)
├── Actions (callable from automations)
├── Triggers/Events (emitted into event bus)
└── Sync jobs (scheduled, rate-limited)
```
- **Provider manifest** (data): id, name, category, auth type, scopes, rate limits, available actions/triggers with input/output JSON schemas → automation builder renders forms dynamically.
- **Adapters** implement `IntegrationProviderPort` in `integrations/providers/<provider>`; adding a provider never changes core modules.
- Credentials: envelope-encrypted (KMS-ready), refresh handled centrally; never sent to browser; rotation & revocation; connection health status.
- Per-provider rate limiters in Redis (token bucket) shared across workers.
- Inbound webhooks: `/webhooks/{provider}/{connectionId}` → verify signature → enqueue → normalize → domain event.

## 18.2 Provider Roadmap
| Category | Providers | Phase |
|---|---|---|
| Social publishing/analytics/inbox | Meta (Instagram, Facebook), LinkedIn, X, YouTube, TikTok, Pinterest, Google Business Profile, Threads | 4–5 |
| Ads | Meta Ads, Google Ads, LinkedIn Ads, TikTok Ads | 5 |
| Communication | Slack, Microsoft Teams, WhatsApp Business, Gmail, Outlook | 3–5 |
| Calendar/Meetings | Google Calendar, Outlook Calendar, Zoom, Google Meet, MS Teams meetings | 4 |
| Storage/Creative | Google Drive, Dropbox, OneDrive, Canva, Adobe Creative Cloud, Figma | 4–5 |
| Payments | Razorpay, Stripe | 3 (agency invoices), 1 (SaaS billing) |
| Accounting | Tally, Zoho Books, QuickBooks, Xero | 5 |
| E-signature | DocuSign, Zoho Sign, Leegality | 5 |
| CRM | HubSpot, Salesforce (sync) | 5 |
| Automation | Zapier, Make, n8n (via public API + webhooks) | 5 |

## 18.3 Email Integration (Phase 5)
Connect Gmail/Outlook: emails auto-associated to client/contact/project by address/domain rules; suggest "Create task under ABC Website" from email; send from platform with tracking.

## 18.4 Public API
- REST (`/api/public/v1`), OpenAPI documented, consistent with internal API standards (RFC 7807 errors, cursor pagination, idempotency keys).
- GraphQL (Phase 6, read-heavy use cases) — optional.
- Auth: OAuth2 (for third-party apps), **API keys** (org-scoped, hashed at rest, prefix-identifiable, scoped permissions, expiry), **service accounts** (non-human members with roles).
- Rate limits per key/plan (config). Usage analytics per key.

## 18.5 Outbound Webhooks
- Org configures endpoints + subscribed events: `task.created`, `task.updated`, `project.created`, `content.published`, `approval.approved`, `client.created`, `invoice.paid`, `file.uploaded`, etc. (from versioned event catalog in `packages/contracts`).
- HMAC-SHA256 signatures with timestamp; retries with exponential backoff (config); delivery logs; manual redeliver; auto-disable after N consecutive failures with notification.

## 18.6 Marketplace (Phase 6+)
- Third-party apps via OAuth + public API + webhooks + UI extension points (later).
- Listing, review, install per org, granted scopes visible, uninstall revokes tokens.
- Revenue share model TBD.

## 18.7 Data Ownership (`integrations` module)
`integration_providers` (manifests), `integration_connections`, `integration_credentials`, `integration_sync_jobs`, `inbound_webhook_events`, `outbound_webhooks`, `webhook_deliveries`, `api_keys`, `service_accounts`, `oauth_apps`, `oauth_grants`.

## 18.8 Acceptance Criteria
- Adding a new provider requires only a new adapter + manifest; no changes in core modules.
- Webhook delivery is at-least-once with signature verification documented and testable.
- Revoking an API key blocks it within one request.
