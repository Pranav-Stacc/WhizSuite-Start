export const BILLING_INTERVALS = ['MONTHLY', 'YEARLY'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = ['TRIALING', 'ACTIVE'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const LIMIT_KEYS = ['seats', 'clients', 'channels', 'storageKb', 'automationRuns'] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];

/** Share of a limit at which usage turns amber / red. */
export const USAGE_WARN_RATIO = 0.8;
export const USAGE_FULL_RATIO = 1;

/** Percentage taken off the monthly price when billed yearly. */
export const ANNUAL_DISCOUNT_PERCENT = 20;
export const MONTHS_PER_YEAR = 12;
export const KB_PER_GB = 1024 * 1024;
export const BILLING_PERIOD_DAYS = 30;
/** Demo seed only: how far into the current billing period the sample subscription is. */
export const SEED_DAYS_INTO_PERIOD = 9;
