# ADR 0011 — Media data sources (platform storage + Google Drive)

## Status

Accepted

## Context

Agency owners need to connect external libraries (Google Drive first), use those files across Media / client assets / portal, transfer platform files to Drive, download zip archives, and see utilized storage against plan limits.

Today all bytes live in platform S3/MinIO behind `StorageService`. Integrations already model `IntegrationProvider` / `IntegrationConnection` / `IntegrationCredential`.

## Decision

1. **Platform S3 remains the system of record** for previews, portal delivery, publish pipelines, and entitlement metering.
2. **Google Drive is an org data source** owned by the `integrations` module (`google_drive` provider), not a replacement blob store.
3. **Import** pulls Drive files into `MediaAsset` / versions on platform storage so the same Media UI and portal work unchanged.
4. **Export / transfer** pushes selected or all READY assets to a Drive folder via a background job.
5. **Zip download** is a media job that writes a temporary zip to platform storage and returns a short-lived signed URL.
6. **Storage usage** is `SUM(media_assets.size_bytes)` for READY assets, compared to plan entitlement `storage.bytes` (`{ max }`). Soft-check on presign; hard-block when over limit.

## Consequences

- Same Media UI for all assets regardless of origin; Drive is a connect/import/export surface, not a second browser.
- BYOS (agency’s own S3 bucket) is out of scope; would need a follow-up ADR.
- Drive OAuth credentials are encrypted on `IntegrationCredential`; scopes limited to Drive file access.
