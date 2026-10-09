import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

export const AUTOMATION_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  ARCHIVED: 'ARCHIVED',
} as const;
export const RUN_STATUS = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
} as const;

const latestVersion = {
  orderBy: { version: 'desc' as const },
  take: 1,
  select: { id: true, version: true, trigger: true, actions: true },
};

export interface AutomationDefinition {
  trigger: object;
  conditions?: object;
  actions: object;
}

@Injectable()
export class AutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit = 50) {
    return this.prisma.automation.findMany({
      where: { organizationId, status: { not: AUTOMATION_STATUS.ARCHIVED } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { versions: latestVersion },
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.automation.findFirst({
      where: {
        id,
        organizationId,
        status: { not: AUTOMATION_STATUS.ARCHIVED },
      },
      include: { versions: latestVersion },
    });
  }

  /** Run totals per automation, keyed by automation id. */
  async runStats(organizationId: string, automationIds: string[]) {
    const grouped = await this.prisma.automationRun.groupBy({
      by: ['versionId', 'status'],
      where: {
        organizationId,
        version: { automationId: { in: automationIds } },
      },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    const versions = await this.prisma.automationVersion.findMany({
      where: {
        organizationId,
        id: { in: [...new Set(grouped.map((g) => g.versionId))] },
      },
      select: { id: true, automationId: true },
    });
    const automationOf = new Map(versions.map((v) => [v.id, v.automationId]));
    const stats = new Map<
      string,
      { runs: number; failures: number; lastRunAt: Date | null }
    >();
    for (const row of grouped) {
      const automationId = automationOf.get(row.versionId);
      if (!automationId) continue;
      const entry = stats.get(automationId) ?? {
        runs: 0,
        failures: 0,
        lastRunAt: null,
      };
      entry.runs += row._count._all;
      if (row.status === RUN_STATUS.FAILED) entry.failures += row._count._all;
      const last = row._max.createdAt;
      if (last && (!entry.lastRunAt || last > entry.lastRunAt))
        entry.lastRunAt = last;
      stats.set(automationId, entry);
    }
    return stats;
  }

  listRuns(organizationId: string, limit: number) {
    return this.prisma.automationRun.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        context: true,
        createdAt: true,
        version: {
          select: {
            automationId: true,
            automation: { select: { name: true } },
          },
        },
      },
    });
  }

  createWithVersion(
    organizationId: string,
    data: { name: string; status: string },
    definition: AutomationDefinition,
  ) {
    return this.prisma.automation.create({
      data: {
        organizationId,
        name: data.name,
        status: data.status,
        versions: {
          create: {
            organizationId,
            version: 1,
            trigger: definition.trigger,
            conditions: definition.conditions ?? {},
            actions: definition.actions,
            publishedAt: new Date(),
          },
        },
      },
    });
  }

  update(
    organizationId: string,
    id: string,
    data: { name?: string; status?: string },
  ) {
    return this.prisma.automation.updateMany({
      where: { id, organizationId },
      data,
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
    data: AutomationDefinition,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.automationVersion.findFirst({
        where: { automationId, organizationId },
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

  findRunById(organizationId: string, runId: string) {
    return this.prisma.automationRun.findFirst({
      where: { id: runId, organizationId },
      include: {
        version: {
          select: {
            id: true,
            trigger: true,
            actions: true,
            automationId: true,
          },
        },
      },
    });
  }

  updateRun(
    organizationId: string,
    runId: string,
    data: {
      status?: string;
      startedAt?: Date;
      completedAt?: Date;
      context?: Prisma.InputJsonObject;
    },
  ) {
    return this.prisma.automationRun.updateMany({
      where: { id: runId, organizationId },
      data,
    });
  }

  createRun(
    organizationId: string,
    versionId: string,
    context?: Prisma.InputJsonObject,
    status: string = RUN_STATUS.QUEUED,
  ) {
    return this.prisma.automationRun.create({
      data: {
        organizationId,
        versionId,
        status,
        context: context ?? {},
      },
    });
  }
}
