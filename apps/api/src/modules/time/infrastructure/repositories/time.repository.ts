import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  timeEntryListWhere,
  type StaffTimeEntryScope,
} from '../../../../shared/tenant/scope-filters';

const TIME_ENTRY_SELECT = {
  id: true,
  membershipId: true,
  projectId: true,
  clientId: true,
  taskId: true,
  minutes: true,
  startedAt: true,
  description: true,
  billable: true,
  createdAt: true,
} satisfies Prisma.TimeEntrySelect;

export type TimeEntryRecord = Prisma.TimeEntryGetPayload<{
  select: typeof TIME_ENTRY_SELECT;
}>;

export interface TimeEntryRow {
  membershipId: string;
  projectId?: string;
  clientId?: string;
  taskId?: string;
  minutes: number;
  startedAt: Date;
  /** Omitted only for a running timer. */
  endedAt?: Date;
  description?: string;
  billable: boolean;
}

/** Running timers have no end time; every finished entry does. */
const FINISHED = {
  endedAt: { not: null },
} satisfies Prisma.TimeEntryWhereInput;
const RUNNING = { endedAt: null } satisfies Prisma.TimeEntryWhereInput;

@Injectable()
export class TimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    limit: number,
    scope?: StaffTimeEntryScope,
  ): Promise<TimeEntryRecord[]> {
    const base: Prisma.TimeEntryWhereInput = {
      organizationId,
      ...FINISHED,
    };
    return this.prisma.timeEntry.findMany({
      where: scope ? timeEntryListWhere(base, scope) : base,
      select: TIME_ENTRY_SELECT,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<TimeEntryRecord | null> {
    return this.prisma.timeEntry.findFirst({
      where: { id, organizationId, ...FINISHED },
      select: TIME_ENTRY_SELECT,
    });
  }

  findRunning(
    organizationId: string,
    membershipId: string,
  ): Promise<TimeEntryRecord | null> {
    return this.prisma.timeEntry.findFirst({
      where: { organizationId, membershipId, ...RUNNING },
      select: TIME_ENTRY_SELECT,
      orderBy: { startedAt: 'desc' },
    });
  }

  create(organizationId: string, row: TimeEntryRow): Promise<TimeEntryRecord> {
    return this.prisma.timeEntry.create({
      data: { ...row, organizationId },
      select: TIME_ENTRY_SELECT,
    });
  }

  /** Discards any running timer of the member and starts a new one atomically. */
  replaceRunning(
    organizationId: string,
    row: TimeEntryRow,
  ): Promise<TimeEntryRecord> {
    return this.prisma.$transaction(async (tx) => {
      await tx.timeEntry.deleteMany({
        where: { organizationId, membershipId: row.membershipId, ...RUNNING },
      });
      return tx.timeEntry.create({
        data: { ...row, organizationId },
        select: TIME_ENTRY_SELECT,
      });
    });
  }

  finish(
    organizationId: string,
    id: string,
    data: { minutes: number; endedAt: Date; description?: string },
  ): Promise<TimeEntryRecord> {
    return this.prisma.timeEntry.update({
      where: { id, organizationId },
      data,
      select: TIME_ENTRY_SELECT,
    });
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.prisma.timeEntry.deleteMany({ where: { id, organizationId } });
  }
}
