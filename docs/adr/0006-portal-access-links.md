# ADR 0006 — Shareable client portal access links

## Status
Accepted

## Context
Agencies share portal access with clients who may or may not install the mobile app. Email-bound invitations already create a permanent password account. We also need a shareable link that:

1. Works in the browser without an app install
2. Can grant temporary or permanent access
3. Lets a temporary guest create a permanent login later
4. Unlocks the full client portal (web and app after login)

## Decision
Extend the existing `InvitationLink` model (previously unused) with:

- `scopePayload` (client id)
- `accessMode` (`TEMPORARY` | `PERMANENT`)
- `membershipTtlHours` for temporary memberships
- `status`, `createdById`

Public flow:

- `GET /v1/portal-access/preview`
- `POST /v1/portal-access/redeem` — name + email; password required for permanent links (or when the email already has a password)
- `POST /v1/portal-access/claim` — authenticated temporary user sets a password and clears `membership.expiresAt`

Staff creates links via `POST /v1/organizations/:orgId/portal-access-links`. Share URL is `{WEB_APP_URL}/portal-access?token=…` (same URL for web and future app deep links). Optional store URLs come from config.

Membership `expiresAt` is enforced on active-membership lookups so temporary access stops after the window.

## Consequences
- Email invitations remain for named invitees; share links cover multi-use / anonymous entry.
- Temporary users can be passwordless until they claim.
- Mobile can open the same URL or later deep-link into an in-app redeem screen.
- A scheduled job to deactivate expired memberships is still desirable; lookups already treat them as inactive.
