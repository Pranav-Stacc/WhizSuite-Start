import 'server-only';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { orgPath } from '@/shared/api/live/utils';
import { LIMIT_KEYS, SUBSCRIPTION_STATUSES, type LimitKey, type SubscriptionStatus } from '../config';
import { PLAN_FEATURES, type Plan, type PlanFeature } from './plans.repository';
import type { Subscription } from './subscription.repository';

const TAG = 'billing';
const MONTHLY_INTERVALS = new Set(['month', 'monthly']);
const NOT_FOUND = 404;

interface ApiPrice {
  currency: string;
  interval: string;
  amountMinor: number;
}

interface ApiCatalogue {
  prices: ApiPrice[];
  entitlements: Record<string, unknown>;
}

interface ApiPlan extends ApiCatalogue {
  id: string;
  name: string;
  description: string | null;
}

interface ApiSubscription extends ApiCatalogue {
  id: string;
  status: string;
  planId: string;
  currentPeriodEnd: string;
}

function limitOf(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof (value as { max?: unknown }).max === 'number') return (value as { max: number }).max;
  return undefined;
}

function enabled(value: unknown): boolean {
  return value === true || (typeof value === 'object' && value !== null && (value as { enabled?: unknown }).enabled === true);
}

function planFromApi(raw: ApiPlan): Plan {
  const limits: Partial<Record<LimitKey, number>> = {};
  for (const key of LIMIT_KEYS) {
    const limit = limitOf(raw.entitlements[key]);
    if (limit !== undefined) limits[key] = limit;
  }
  return {
    id: raw.id,
    name: raw.name,
    tagline: raw.description ?? '',
    monthlyMinor: raw.prices.find((p) => MONTHLY_INTERVALS.has(p.interval.toLowerCase()))?.amountMinor,
    limits,
    features: PLAN_FEATURES.filter((feature): feature is PlanFeature => enabled(raw.entitlements[feature])),
    recommended: false,
  };
}

function statusOf(value: string): SubscriptionStatus | undefined {
  return SUBSCRIPTION_STATUSES.find((s) => s === value);
}

async function billingPath(segment: string): Promise<{ path: string; tags: string[] }> {
  const org = (await getSession())?.orgId ?? '';
  return { path: orgPath(org, `billing/${segment}`), tags: [`org:${org}:${TAG}`] };
}

export async function fetchPlans(): Promise<Plan[]> {
  const { path, tags } = await billingPath('plans');
  return (await apiFetch<ApiPlan[]>(path, { tags })).map(planFromApi);
}

/** The organisation's subscription, or undefined when it is not on a plan. */
export async function fetchSubscription(): Promise<Subscription | undefined> {
  const { path, tags } = await billingPath('subscription');
  try {
    const raw = await apiFetch<ApiSubscription>(path, { tags });
    const status = statusOf(raw.status);
    if (!status) return undefined;
    return { id: raw.id, planId: raw.planId, interval: 'MONTHLY', status, currentPeriodEnd: raw.currentPeriodEnd };
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND) return undefined;
    throw error;
  }
}
