import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

const versionDetails = { include: { entitlements: true, prices: true } };

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSubscription(organizationId: string) {
    return this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        planVersion: {
          include: { plan: true, entitlements: true, prices: true },
        },
      },
    });
  }

  /** Active catalogue plans with their latest version. */
  listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1, ...versionDetails },
      },
    });
  }

  async getEntitlements(organizationId: string) {
    const sub = await this.findSubscription(organizationId);
    return sub?.planVersion.entitlements ?? [];
  }
}
