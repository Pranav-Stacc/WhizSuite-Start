import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { BillingRepository } from '../../infrastructure/repositories/billing.repository';

interface VersionLike {
  entitlements: Array<{ key: string; value: unknown }>;
  prices: Array<{ currency: string; interval: string; amountMinor: number }>;
}

function catalogueFields(version: VersionLike | undefined) {
  return {
    prices: (version?.prices ?? []).map(
      ({ currency, interval, amountMinor }) => ({
        currency,
        interval,
        amountMinor,
      }),
    ),
    entitlements: Object.fromEntries(
      (version?.entitlements ?? []).map((e) => [e.key, e.value]),
    ),
  };
}

@Injectable()
export class BillingService {
  constructor(private readonly repository: BillingRepository) {}

  async listPlans() {
    const plans = await this.repository.listPlans();
    return plans.map((plan) => ({
      id: plan.id,
      key: plan.key,
      name: plan.name,
      description: plan.description,
      ...catalogueFields(plan.versions[0]),
    }));
  }

  async getSubscription(organizationId: string) {
    const sub = await this.repository.findSubscription(organizationId);
    if (!sub) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          code: ErrorCodes.NOT_FOUND,
        },
        404,
      );
    }
    return {
      id: sub.id,
      status: sub.status,
      planId: sub.planVersion.plan.id,
      planKey: sub.planVersion.plan.key,
      planName: sub.planVersion.plan.name,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      ...catalogueFields(sub.planVersion),
    };
  }

  async hasFeature(organizationId: string, key: string): Promise<boolean> {
    const entitlements = await this.repository.getEntitlements(organizationId);
    const entry = entitlements.find((e) => e.key === key);
    if (!entry) return false;
    const value = entry.value as { enabled?: boolean };
    return value.enabled !== false;
  }

  async checkLimit(
    organizationId: string,
    key: string,
    current: number,
  ): Promise<boolean> {
    const max = await this.limitMax(organizationId, key);
    if (max === null) return true;
    return current < max;
  }

  /** Plan cap for an entitlement key, or null when unlimited / unset. */
  async limitMax(organizationId: string, key: string): Promise<number | null> {
    const entitlements = await this.repository.getEntitlements(organizationId);
    const entry = entitlements.find((e) => e.key === key);
    if (!entry) return null;
    return parseEntitlementMax(entry.value);
  }
}

function parseEntitlementMax(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'max' in value) {
    const max = (value as { max: unknown }).max;
    if (typeof max === 'number' && Number.isFinite(max)) return max;
  }
  return null;
}
