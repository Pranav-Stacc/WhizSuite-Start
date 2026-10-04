# 10 — Media Library (DAM-lite)

## 10.1 Structure
```
Media Library (org → client/brand scoped)
├── Images
├── Videos
├── Documents
├── Brand Assets (from Brand Kit)
├── Logos
├── Fonts
├── Templates (Canva links, PSD/AI/Figma files)
├── Raw Footage / Shoots
├── UGC (user-generated content with rights status)
└── Final Deliverables (auto-collected from published content)
```

## 10.2 Features
- Folders (nested, materialized path) + **smart collections** (saved filters).
- Tags (manual + AI auto-tags: objects, colors, faces-off by default for privacy, text OCR — Phase 4).
- Search: filename, tags, type, client, campaign, uploader, date, dimensions, duration, orientation, color, usage status (used/unused/published).
- **Versions:** upload new version keeps history; restore; compare.
- Previews: image renditions (thumbnail/medium/large/WebP/AVIF), video transcode (HLS for review playback + poster frames), PDF page thumbnails, document previews.
- Comments → feedback engine ([09](09-feedback-and-creative-review.md)).
- Permissions: inherits client/project scope; folder-level overrides (e.g. "Raw Footage" internal only).
- **Client access** flags per folder/file (visible in portal).
- **Sharing:** expiring links, password, download allowed/blocked, view count limits, watermark on preview (Phase 4).
- **Usage tracking:** where an asset was used (content items, published posts).
- **Rights management for UGC/stock:** source, creator, license, expiry → expiry alert and block-from-scheduling option.
- Bulk upload (resumable, multipart, up to configured size), bulk tag/move/download (zip job).
- Import from Google Drive, Dropbox, Canva, OneDrive ([18](18-integrations-and-api.md)).

## 10.3 Storage Architecture
- **S3-compatible object storage** (AWS S3 / Cloudflare R2 / MinIO local) behind a `StoragePort`.
- Direct-to-storage uploads via presigned multipart URLs (browser never sees credentials); server validates on completion (size, MIME sniffing, malware scan hook).
- Object keys: `orgs/{orgId}/clients/{clientId}/{assetId}/{versionId}/{rendition}`.
- CDN in front with **signed URLs/cookies**, TTL configurable; no public buckets.
- Processing pipeline: `file.uploaded` → queue → virus scan → metadata extraction (EXIF strip option) → renditions/transcode → `file.processed`.
- **Storage quotas** per plan (entitlements); usage metered for billing ([19](19-saas-billing.md)).
- Lifecycle: soft delete → trash (retention configurable) → hard delete job; versions retention configurable.

## 10.4 Data Ownership (`media` module)
`media_folders`, `media_assets`, `media_asset_versions`, `media_renditions`, `media_tags`, `media_asset_tags`, `media_collections`, `media_share_links`, `media_usage_refs`, `media_rights`.

## 10.5 Events
`file.uploaded`, `file.processed`, `file.version_created`, `file.shared`, `file.downloaded` (audited for sensitive folders), `file.deleted`, `media.rights_expiring`.

## 10.6 Acceptance Criteria
- 2 GB video uploads succeed with resumable multipart on flaky connections.
- No asset URL is accessible without a valid signature or permission.
- Search over 100k assets per org returns in < 300 ms p95.
