# 12 — Analytics & Client Reporting

Reporting is where SMMAs prove value — and where they lose the most hours. Goal: monthly client report in < 5 minutes.

## 12.1 Social Analytics
### Account/channel level (daily snapshots)
Followers, follower growth, reach, impressions, profile visits, website clicks, engagement, engagement rate (formula configurable: by reach or by followers), posts published, video views, watch time, story metrics, audience demographics (where APIs allow).

### Post level
Reach, impressions, likes, comments, shares, saves, video views, avg watch time, completion rate, clicks, engagement rate; sync schedule after publish (e.g. +1h, +24h, +7d, +30d — configurable) then periodic.

### Analysis
- Best-performing content, by pillar/format/time/day/caption length/hashtag set.
- Content pillar performance vs mix.
- Best time to post heatmap.
- **Cross-client comparison** (agency internal only).
- **Competitor benchmarking** (Phase 5): public metrics for competitor handles in brand kit.
- **Social listening** (Phase 6): brand/keyword mentions beyond owned channels via third-party provider.

### Agency-operational analytics
Approval turnaround, revision rounds, on-time delivery %, retainer delivery vs quota, inbox SLA compliance, team utilization, client profitability, publish success rate.

## 12.2 Paid Ads (Phase 5)
Read-only ads insights first (Meta Ads, Google Ads, LinkedIn Ads, TikTok Ads): spend, impressions, clicks, CTR, CPC, CPM, leads, conversions, CPA, ROAS — unified across platforms per client/campaign. Later: boost posts and push ad creatives.

## 12.3 Data Pipeline
- Ingestion jobs per platform with rate-limit budgets → normalized metric facts stored in **analytics tables** (time-series friendly: `metric_snapshots` partitioned by month; BRIN index on time; composite indexes on `(organization_id, channel_id, date)`).
- Rollups (daily → weekly/monthly) precomputed by jobs; dashboards read rollups, not raw facts.
- Metric definitions are **configuration** (name, formula, unit, platforms supported) → one metric registry used by dashboards and reports.
- Future: move analytics to a columnar store (ClickHouse/BigQuery) behind an `AnalyticsQueryPort` without changing consumers.

## 12.4 Dashboards
- Prebuilt: Agency overview, Client overview, Channel, Campaign, Content, Team, Inbox, Finance.
- Custom dashboards (Phase 4): widget grid (KPI card, line, bar, table, top posts, pie), date ranges + compare period, filters; saved & shareable within scope.

## 12.5 Client Reports
- **Report templates** (drag-and-drop sections): cover, executive summary, KPI cards, charts, top posts, pillar breakdown, inbox stats, ads summary, deliverables completed vs retainer, next month plan, custom text/images.
- **White-labeled** (agency branding, fonts, colors).
- **AI executive summary** draft ([16](16-ai-features.md)) editable by AM.
- Generation: scheduled (monthly on configured day) or on demand → rendered server-side to **PDF**, live **web link** (portal), and PPTX (Phase 5); email delivery with tracking.
- Review flow: report draft → AM review (optional approval) → send to client.
- Snapshot semantics: sent reports are frozen (data as of generation) and versioned.

## 12.6 Data Ownership
- `analytics` module: `metric_definitions`, `metric_snapshots`, `metric_rollups`, `post_metrics`, `audience_snapshots`, `dashboards`, `dashboard_widgets`.
- `reporting` module: `report_templates`, `report_sections`, `reports`, `report_versions`, `report_deliveries`.

## 12.7 Events
`analytics.sync_completed`, `analytics.anomaly_detected` (Phase 5), `report.generated`, `report.sent`, `report.viewed`.

## 12.8 Acceptance Criteria
- Monthly report for a client with 5 channels generates in < 60 s.
- Dashboard queries p95 < 500 ms on 2 years of data for an org with 200 clients.
- Metric formulas changed in config apply consistently to dashboards and new reports.
