import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

export interface SnapshotQuery {
  from?: Date;
  metricKeys?: string[];
  limit: number;
}

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, query: SnapshotQuery) {
    return this.prisma.metricSnapshot.findMany({
      where: {
        organizationId,
        ...(query.from ? { recordedAt: { gte: query.from } } : {}),
        ...(query.metricKeys?.length
          ? { metricKey: { in: query.metricKeys } }
          : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: query.limit,
      select: {
        id: true,
        metricKey: true,
        channelId: true,
        contentVariantId: true,
        value: true,
        recordedAt: true,
      },
    });
  }

  create(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.metricSnapshot.create({
      data: { ...data, organizationId } as never,
    });
  }
}
