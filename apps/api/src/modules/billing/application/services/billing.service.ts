import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { BillingRepository } from '../../infrastructure/repositories/billing.repository';

@Injectable()
export class BillingService {
  constructor(private readonly repository: BillingRepository) {}

  async getSubscription(organizationId: string) {
    const sub = await this.repository.findSubscription(organizationId);
    if (!sub) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return sub;
  }

  async hasFeature(organizationId: string, key: string): Promise<boolean> {
    const entitlements = await this.repository.getEntitlements(organizationId);
    const entry = entitlements.find((e) => e.key === key);
    if (!entry) return false;
    const value = entry.value as { enabled?: boolean };
    return value.enabled !== false;
  }

  async checkLimit(organizationId: string, key: string, current: number): Promise<boolean> {
    const entitlements = await this.repository.getEntitlements(organizationId);
    const entry = entitlements.find((e) => e.key === key);
    if (!entry) return true;
    const limit = entry.value as { max?: number };
    if (limit.max === undefined) return true;
    return current < limit.max;
  }
}
