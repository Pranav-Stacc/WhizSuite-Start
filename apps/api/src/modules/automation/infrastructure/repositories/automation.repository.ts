import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class AutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit = 50) {
    return this.prisma.automation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.automation.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.automation.create({
      data: { ...data, organizationId } as never,
    });
  }

  update(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.automation.updateMany({
      where: { id, organizationId },
      data: data as never,
    });
  }

  findLatestPublishedVersion(organizationId: string, automationId: string) {
    return this.prisma.automationVersion.findFirst({
      where: { organizationId, automationId, publishedAt: { not: null } },
      orderBy: { version: 'desc' },
    });
  }

  createVersion(
    organizationId: string,
    automationId: string,
    data: { trigger: object; conditions?: object; actions: object },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.automationVersion.findFirst({
        where: { automationId },
        orderBy: { version: 'desc' },
      });
      const version = (latest?.version ?? 0) + 1;
      return tx.automationVersion.create({
        data: {
          organizationId,
          automationId,
          version,
          trigger: data.trigger,
          conditions: data.conditions ?? {},
          actions: data.actions,
          publishedAt: new Date(),
        },
      });
    });
  }

  createRun(
    organizationId: string,
    versionId: string,
    context?: Record<string, unknown>,
  ) {
    return this.prisma.automationRun.create({
      data: {
        organizationId,
        versionId,
        status: 'COMPLETED',
        context: (context ?? {}) as object,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }
}
