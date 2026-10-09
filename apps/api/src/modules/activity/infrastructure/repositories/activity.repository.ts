import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

export interface ActivityCreateRow {
  actorId: string;
  verb: string;
  entityType: string;
  entityId: string;
  summary: string;
  visibility?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number) {
    return this.prisma.activityEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  create(organizationId: string, row: ActivityCreateRow) {
    return this.prisma.activityEvent.create({
      data: { organizationId, ...row, metadata: toInputJson(row.metadata) },
    });
  }
}
