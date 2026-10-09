# ADR 0009 — Workspace product subdomains (Main / CRM / Finance)

## Status
Accepted

## Context
Agency workspaces mix delivery (clients, content, tasks), CRM lead-gen (pipeline), and finance (invoices, reports, time). Putting everything in one nav makes the product feel crowded and blocks deep feature growth per domain.

## Decision
Each agency (`Organization.slug`) gets three product surfaces on a shared root domain.

Amplify managed TLS only covers **one** wildcard label (`*.whizsuite.com`), so CRM/Finance use a single-label prefix (not nested `crm.{slug}`):

| Surface | Host | Owns |
|---|---|---|
| Main workspace | `{slug}.{root}` | Dashboard, **clients** (post-conversion accounts), chat/inbox, work, content, automate, agency admin |
| CRM | `crm-{slug}.{root}` | **Lead gen / pipeline only** (`/leads`). Converting a lead creates a client and opens it on Main. |
| Finance | `finance-{slug}.{root}` | Invoices, reports, time, client agreements/billing |

Example with `root = whizsuite.com` and slug `workplace`:

- `workplace.whizsuite.com`
- `crm-workplace.whizsuite.com`
- `finance-workplace.whizsuite.com`

Staff open CRM/Finance from the **Workspace switcher** in the main shell (permission-gated: CRM needs `LEADS_VIEW`). Cross-module deep links redirect to the owning host when `APP_ROOT_DOMAIN` is set.

Local / pre-DNS mode: leave `APP_ROOT_DOMAIN` empty; the switcher sets an `ao_workspace_module` cookie and filters nav in place. Lead convert flips the cookie to `main` and routes to `/clients/{id}`.

Session SSO across subdomains uses `SESSION_COOKIE_DOMAIN=.whizsuite.com`. API `CORS_ORIGINS` supports `https://*.whizsuite.com` wildcards.

## Consequences
- Main owns Clients; CRM does not list `/clients`. Chat lives on Main.
- DNS: `*.whizsuite.com` → Amplify CloudFront; enable Amplify **auto subdomain** so cert + routing cover agency hosts.
- Portal remains on the main host (`/portal`) for this phase; a dedicated portal subdomain can follow ADR 0006 / PRD 13.
