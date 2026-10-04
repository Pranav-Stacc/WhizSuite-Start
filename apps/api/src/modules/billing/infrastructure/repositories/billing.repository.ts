import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

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

  async getEntitlements(organizationId: string) {
    const sub = await this.findSubscription(organizationId);
    return sub?.planVersion.entitlements ?? [];
  }
}
