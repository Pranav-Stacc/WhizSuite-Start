# 20 — Non-Functional Requirements

All thresholds below are targets and are themselves configurable where operationally relevant.

## 20.1 Performance
| Area | Target |
|---|---|
| API read endpoints | p95 < 200 ms, p99 < 500 ms |
| API write endpoints | p95 < 300 ms |
| Authorization check | p95 < 5 ms cached |
| SSR page TTFB (internal app) | p95 < 600 ms |
| Largest Contentful Paint | < 2.5 s on 4G mid-range mobile (portal) |
| Realtime event delivery | p95 < 1 s |
| Scheduled publish accuracy | ±60 s p99 |
| Search | p95 < 300 ms |

Engineering rules: no N+1 queries, select only needed columns, cursor pagination, batch loaders, O(n) or better algorithms on collections, precomputed rollups for analytics, Redis cache-aside with explicit invalidation.

## 20.2 Scalability (design targets, year 2)
- 5,000 agencies, 100,000 internal users, 500,000 client users, 1M connected channels, 5M scheduled posts/month, 50M inbox messages/month.
- Stateless API and workers → horizontal scaling; queues per domain; Postgres read replicas for heavy reads; table partitioning for audit logs, metrics, inbox messages, notifications.
- Any module extractable as a microservice (see [21](21-technical-architecture.md)).

## 20.3 Availability & Reliability
- SLA: 99.9% (Growth/Pro), 99.95% (Enterprise) for API + portal.
- Publishing pipeline isolated from web traffic (separate worker deployments) so UI incidents don't stop publishing and vice versa.
- RPO ≤ 5 min (PITR backups), RTO ≤ 1 h; daily backup restore tests (automated).
- Graceful degradation: analytics/AI/search outages never block core workflows.
- Transactional outbox for all cross-module events; idempotent consumers; DLQs with alerting.

## 20.4 Security
- OWASP ASVS L2 target; OWASP Top 10 mitigations.
- Tenant isolation: app-level scoping + Postgres RLS + key/storage prefixes + automated cross-tenant tests in CI.
- Encryption: TLS 1.2+ in transit; AES-256 at rest (DB, storage, backups); envelope encryption for OAuth tokens/secrets.
- AuthN: rotating refresh tokens, MFA, SSO (Enterprise), session management; brute-force protection.
- AuthZ: RBAC + scopes + conditions, server-enforced; frontend only reflects capability maps.
- Input validation on every boundary; output encoding; CSP; signed URLs for media; SSRF protection on webhooks/link previews (egress allowlist/denylist, no internal IPs).
- Secrets via secret manager; dependency & container scanning; secret scanning in CI.
- **Audit log for every action** (append-only, immutable, retention configurable).
- Pen test before GA and annually; responsible disclosure policy.
- Platform staff access: just-in-time, audited, tenant-visible impersonation log.

## 20.5 Privacy & Compliance
- **India DPDP Act 2023** (primary), **GDPR** (EU clients of agencies), CCPA readiness.
- Roles: agency = data fiduciary/controller for client data; platform = processor. DPA template for agencies.
- Data subject requests: export & delete per user/contact; tenant full export (JSON + files) and deletion workflow.
- Data residency option (India region default; EU region Phase 5).
- Consent & legal basis for marketing communications; unsubscribe handling.
- Platform API terms compliance (Meta, LinkedIn, Google, TikTok app review requirements; data use restrictions; token handling).
- SOC 2 Type I (year 1–2), Type II and ISO 27001 later.

## 20.6 Observability
- OpenTelemetry traces across HTTP, DB, Redis, queues, events; correlation ID everywhere.
- Structured JSON logs (pino) with PII redaction.
- Metrics: RED per endpoint, queue depth/latency, publish success rate per platform, webhook ingestion lag, cache hit ratio, DB pool.
- SLOs + alerts (publishing failures spike, token refresh failures, DLQ growth, error budget burn).
- Status page (public) per component.

## 20.7 Accessibility & Internationalization
- WCAG 2.1 AA for internal app and portal.
- i18n: all UI strings in catalogs; English first, Hindi + regional languages and global locales later; locale-aware dates/numbers/currency; per-user timezone; RTL readiness.

## 20.8 Maintainability
- Modular monolith with enforced boundaries; strict TypeScript; shared contracts package; ADRs.
- Test pyramid with coverage thresholds; contract tests per module port and event schema.
- Zero dead code/duplication policy (see project rules).

## 20.9 Browser & Device Support
Latest 2 versions of Chrome, Edge, Safari, Firefox; iOS Safari 16+, Android Chrome; portal fully responsive + PWA.
