import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';
import { BILLING_PERIOD_DAYS, SEED_DAYS_INTO_PERIOD, type BillingInterval, type SubscriptionStatus } from '../config';

export interface Subscription extends Entity {
  planId: string;
  interval: BillingInterval;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
}

export const SUBSCRIPTION_ID = 'sub-current';

export const subscriptionRepository = createRepository<Subscription>('subscription', () => [
  {
    id: SUBSCRIPTION_ID,
    planId: 'plan-growth',
    interval: 'MONTHLY',
    status: 'ACTIVE',
    currentPeriodEnd: daysFromNow(BILLING_PERIOD_DAYS - SEED_DAYS_INTO_PERIOD),
  },
]);

export interface BillingInvoice extends Entity {
  number: string;
  issuedAt: string;
  amountMinor: number;
  planName: string;
}

const issuedDaysAgo = (periodsAgo: number): string => daysFromNow(-(SEED_DAYS_INTO_PERIOD + periodsAgo * BILLING_PERIOD_DAYS));

export const billingInvoicesRepository = createRepository<BillingInvoice>('billing-invoices', () => [
  { id: 'bi3', number: 'AOS-2026-0003', issuedAt: issuedDaysAgo(0), amountMinor: 599_900, planName: 'Growth' },
  { id: 'bi2', number: 'AOS-2026-0002', issuedAt: issuedDaysAgo(1), amountMinor: 599_900, planName: 'Growth' },
  { id: 'bi1', number: 'AOS-2026-0001', issuedAt: issuedDaysAgo(2), amountMinor: 199_900, planName: 'Starter' },
]);
