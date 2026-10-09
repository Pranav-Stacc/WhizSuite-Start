# 19 — SaaS Billing, Plans & Entitlements

How agencies pay **us** (distinct from agencies invoicing their clients in [14](14-finance-and-operations.md)).

## 19.1 Model
```
Organization → Subscription → Plan (versioned) → Entitlements (features + limits)
                            → Add-ons
                            → Usage records (metered)
```
- **Plans are data**, not code: plan catalog with versioned features/limits/prices per currency and billing interval. Grandfathering via plan versions.
- **Entitlements service** answers `hasFeature(org, 'approvals.multi_step')` and `checkLimit(org, 'seats')` — cached per org in Redis, invalidated on subscription change. Every module checks entitlements via this port, never by plan name.
- Feature flags (rollout) are separate from entitlements (commercial) but evaluated through the same configuration layer.

## 19.2 Indicative Packaging (prices are configuration, not commitments)
| | Starter | Growth | Agency Pro | Enterprise |
|---|---|---|---|---|
| Indicative price | ₹1,999/mo | ₹5,999/mo | ₹14,999/mo | Custom |
| Internal seats | 5 | 20 | 50 | Custom |
| Clients (brands) | 10 | 40 | Unlimited | Unlimited |
| Social channels | 25 | 100 | 300 | Custom |
| Client portal users | Unlimited (free) | Unlimited | Unlimited | Unlimited |
| Projects/tasks/content | ✓ | ✓ | ✓ | ✓ |
| Content calendar & scheduling | ✓ | ✓ | ✓ | ✓ |
| Approvals | Single-step | Multi-step | Multi-step + conditional | All |
| Creative review (annotations) | Images | Images + video + PDF | All + guest reviewers | All |
| Team & client chat | — | ✓ | ✓ | ✓ |
| Automations (runs/mo) | 500 | 5,000 | 25,000 | Custom |
| Custom workflows/states | 1 pipeline | Unlimited | Unlimited | Unlimited |
| Reports | Standard | White-label PDF + link | + scheduled + custom templates | All |
| Custom domain / white-label | — | Portal domain | Portal + email domain | Full white-label |
| Finance (proposals/invoices) | — | Invoices | Full | Full |
| Time & capacity | Time tracking | ✓ | ✓ + forecasting | ✓ |
| AI credits/mo | Trial | 500 | 2,500 | Custom |
| Advanced RBAC (conditions, deny) | — | — | ✓ | ✓ |
| SSO/SAML, SCIM, IP allowlist | — | — | — | ✓ |
| Audit log retention | 30 days | 90 days | 1 year | Custom (7y) |
| Storage | 50 GB | 250 GB | 1 TB | Custom |
| API & webhooks | — | Read API | Full | Full + higher limits |
| Support / SLA | Email | Priority | Priority + onboarding | Dedicated + SLA |
| Dedicated infra | — | — | — | Optional |

Pricing levers to validate: per-seat vs per-client vs per-channel; client portal users free (adoption driver).

## 19.3 Subscription Lifecycle
`TRIALING` (configurable days, no card or card-required — config) → `ACTIVE` → `PAST_DUE` (dunning schedule, grace period config) → `SUSPENDED` (read-only; publishing paused with warnings) → `CANCELLED` (data retention period → export → deletion).
- Upgrades prorated immediately; downgrades at period end with limit-violation resolution flow (choose which seats/channels to keep).
- Annual discount (config).
- Add-ons: extra seats, extra channels, storage packs, AI credits, white-label.

## 19.4 Payments & Tax
- Providers: Razorpay (India, UPI/cards/netbanking, mandates for recurring) and Stripe (global) behind `PaymentProviderPort`.
- GST invoices to agencies (our GSTIN, their GSTIN, place of supply), reverse charge handling for exports.
- Webhook-driven state sync, idempotent.

## 19.5 Usage Metering
Seats, clients, channels, storage bytes, automation runs, AI tokens/credits, API calls, report generations → `usage_records` aggregated daily; soft limit warnings (80%/100% thresholds configurable) → hard limit enforcement per entitlement policy (block / allow overage billing).

## 19.6 Data Ownership (`billing` module)
`plans`, `plan_versions`, `plan_entitlements`, `plan_prices`, `addons`, `subscriptions`, `subscription_items`, `usage_records`, `usage_aggregates`, `billing_invoices`, `billing_payments`, `billing_customers`, `coupons`.

## 19.7 Acceptance Criteria
- Changing a plan's limits in the admin console applies to all orgs on that plan version without deploy.
- No module references plan names in code — only entitlement keys.
- Downgrade never deletes data silently.
