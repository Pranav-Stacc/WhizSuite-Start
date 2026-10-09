import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

export interface CalendarItemCreateRow {
  id?: string;
  sourceType: string;
  sourceId: string;
  title: string;
  startsAt: Date;
  endsAt?: Date;
  allDay?: boolean;
  clientId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface CalendarItemUpdateRow {
  title?: string;
  startsAt?: Date;
  endsAt?: Date | null;
  allDay?: boolean;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CalendarRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    limit: number,
    clientIds?: string[],
    range?: { from?: Date; to?: Date },
  ) {
    return this.prisma.calendarItem.findMany({
      where: {
        organizationId,
        ...(clientIds ? { clientId: { in: clientIds } } : {}),
        ...(range?.from || range?.to
          ? {
              startsAt: {
                ...(range.from ? { gte: range.from } : {}),
                ...(range.to ? { lt: range.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.calendarItem.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, row: CalendarItemCreateRow) {
    return this.prisma.calendarItem.create({
      data: { ...row, organizationId, metadata: toInputJson(row.metadata) },
    });
  }

  update(organizationId: string, id: string, row: CalendarItemUpdateRow) {
    return this.prisma.calendarItem.updateMany({
      where: { id, organizationId },
      data: { ...row, metadata: toInputJson(row.metadata) },
    });
  }
}
