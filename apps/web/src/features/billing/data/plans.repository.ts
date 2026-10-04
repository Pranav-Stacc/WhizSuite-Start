import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';
import { KB_PER_GB, type LimitKey } from '../config';

/** Feature entitlements that appear in the plan comparison. Labels live in the message catalog. */
export const PLAN_FEATURES = ['calendar', 'approvals', 'inbox', 'invoices', 'reports', 'whiteLabel', 'support'] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export interface Plan extends Entity {
  name: string;
  tagline: string;
  /** Monthly price in minor units; undefined means "talk to us". */
  monthlyMinor?: number;
  /** A missing limit means unlimited. */
  limits: Partial<Record<LimitKey, number>>;
  features: PlanFeature[];
  recommended: boolean;
}

/** Plans are data, not code: edit this catalog (or the API) without touching feature logic. */
export const plansRepository = createRepository<Plan>('plans', () => [
  {
    id: 'plan-starter',
    name: 'Starter',
    tagline: 'For small agencies getting organised.',
    monthlyMinor: 199_900,
    limits: { seats: 5, clients: 10, channels: 25, storageKb: 50 * KB_PER_GB, automationRuns: 500 },
    features: ['calendar', 'approvals', 'support'],
    recommended: false,
  },
  {
    id: 'plan-growth',
    name: 'Growth',
    tagline: 'For growing teams running many brands.',
    monthlyMinor: 599_900,
    limits: { seats: 20, clients: 40, channels: 100, storageKb: 250 * KB_PER_GB, automationRuns: 5_000 },
    features: ['calendar', 'approvals', 'inbox', 'invoices', 'reports', 'support'],
    recommended: true,
  },
  {
    id: 'plan-pro',
    name: 'Agency Pro',
    tagline: 'For established agencies at scale.',
    monthlyMinor: 1_499_900,
    limits: { seats: 50, channels: 300, storageKb: 1024 * KB_PER_GB, automationRuns: 25_000 },
    features: ['calendar', 'approvals', 'inbox', 'invoices', 'reports', 'whiteLabel', 'support'],
    recommended: false,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    tagline: 'Custom limits, SSO and a dedicated team.',
    limits: {},
    features: ['calendar', 'approvals', 'inbox', 'invoices', 'reports', 'whiteLabel', 'support'],
    recommended: false,
  },
]);
