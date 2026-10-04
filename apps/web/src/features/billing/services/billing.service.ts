import 'server-only';
import { listAutomations } from '@/features/automations/services/automations.service';
import { listClients } from '@/features/clients/services/clients.service';
import { listIntegrations } from '@/features/integrations/services/integrations.service';
import { listAssets } from '@/features/media/services/media.service';
import { listMembers } from '@/features/team/services/members.service';
import { ANNUAL_DISCOUNT_PERCENT, LIMIT_KEYS, MONTHS_PER_YEAR, USAGE_FULL_RATIO, USAGE_WARN_RATIO, type BillingInterval, type LimitKey } from '../config';
import { plansRepository, type Plan } from '../data/plans.repository';
import { billingInvoicesRepository, subscriptionRepository, SUBSCRIPTION_ID, type BillingInvoice, type Subscription } from '../data/subscription.repository';

export type Usage = Record<LimitKey, number>;
export type UsageLevel = 'ok' | 'warning' | 'full';

export interface UsageRow {
  key: LimitKey;
  used: number;
  limit?: number;
  ratio: number;
  level: UsageLevel;
}

export async function listPlans(): Promise<Plan[]> {
  return plansRepository.list();
}

export async function getSubscription(): Promise<Subscription> {
  const subscription = await subscriptionRepository.get(SUBSCRIPTION_ID);
  if (!subscription) throw new Error('Subscription missing');
  return subscription;
}

export async function listBillingInvoices(): Promise<BillingInvoice[]> {
  const rows = await billingInvoicesRepository.list();
  return rows.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export async function currentUsage(): Promise<Usage> {
  const [members, clients, integrations, assets, automations] = await Promise.all([
    listMembers(),
    listClients(),
    listIntegrations(),
    listAssets(),
    listAutomations(),
  ]);
  return {
    seats: members.length,
    clients: clients.length,
    channels: integrations.filter((i) => i.connected).length,
    storageKb: assets.reduce((acc, asset) => acc + asset.sizeKb, 0),
    automationRuns: automations.reduce((acc, automation) => acc + automation.runs, 0),
  };
}

export function levelFor(ratio: number): UsageLevel {
  if (ratio >= USAGE_FULL_RATIO) return 'full';
  return ratio >= USAGE_WARN_RATIO ? 'warning' : 'ok';
}

export function usageRows(usage: Usage, plan: Plan): UsageRow[] {
  return LIMIT_KEYS.map((key) => {
    const limit = plan.limits[key];
    const ratio = limit ? usage[key] / limit : 0;
    return { key, used: usage[key], limit, ratio, level: limit ? levelFor(ratio) : 'ok' };
  });
}

/** Limits a target plan would put the workspace over — downgrades are refused until these are resolved. */
export function exceededLimits(usage: Usage, plan: Plan): LimitKey[] {
  return LIMIT_KEYS.filter((key) => {
    const limit = plan.limits[key];
    return limit !== undefined && usage[key] > limit;
  });
}

/** Effective per-month price in minor units for the chosen interval; undefined for custom-priced plans. */
export function monthlyPrice(plan: Plan, interval: BillingInterval): number | undefined {
  if (plan.monthlyMinor === undefined) return undefined;
  return interval === 'YEARLY' ? Math.round((plan.monthlyMinor * (100 - ANNUAL_DISCOUNT_PERCENT)) / 100) : plan.monthlyMinor;
}

export function chargePerPeriod(plan: Plan, interval: BillingInterval): number | undefined {
  const monthly = monthlyPrice(plan, interval);
  if (monthly === undefined) return undefined;
  return interval === 'YEARLY' ? monthly * MONTHS_PER_YEAR : monthly;
}
