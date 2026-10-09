import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

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
  description?: string;
  billable: boolean;
}

@Injectable()
export class TimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number): Promise<TimeEntryRecord[]> {
    return this.prisma.timeEntry.findMany({
      where: { organizationId },
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
      where: { id, organizationId },
      select: TIME_ENTRY_SELECT,
    });
  }

  create(organizationId: string, row: TimeEntryRow): Promise<TimeEntryRecord> {
    return this.prisma.timeEntry.create({
      data: { ...row, organizationId },
      select: TIME_ENTRY_SELECT,
    });
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.prisma.timeEntry.deleteMany({ where: { id, organizationId } });
  }
}
