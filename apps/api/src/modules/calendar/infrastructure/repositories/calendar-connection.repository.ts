import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class CalendarConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOrganization(organizationId: string) {
    return this.prisma.calendarConnection.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIntegrationConnection(
    organizationId: string,
    integrationConnectionId: string,
  ) {
    return this.prisma.calendarConnection.findFirst({
      where: { organizationId, integrationConnectionId },
    });
  }

  upsert(
    organizationId: string,
    input: {
      integrationConnectionId: string;
      externalCalendarId?: string;
      syncDirection?: string;
      defaultSyncNewEvents?: boolean;
      syncTypes?: object;
    },
  ) {
    return this.prisma.calendarConnection.upsert({
      where: { integrationConnectionId: input.integrationConnectionId },
      create: {
        organizationId,
        integrationConnectionId: input.integrationConnectionId,
        externalCalendarId: input.externalCalendarId ?? 'primary',
        syncDirection: input.syncDirection ?? 'OUT',
        defaultSyncNewEvents: input.defaultSyncNewEvents ?? false,
        syncTypes: input.syncTypes ?? undefined,
      },
      update: {
        externalCalendarId: input.externalCalendarId,
        syncDirection: input.syncDirection,
        defaultSyncNewEvents: input.defaultSyncNewEvents,
        syncTypes: input.syncTypes,
      },
    });
  }

  updateSettings(
    organizationId: string,
    id: string,
    input: {
      externalCalendarId?: string;
      syncDirection?: string;
      defaultSyncNewEvents?: boolean;
      syncTypes?: object;
      lastSyncedAt?: Date | null;
    },
  ) {
    return this.prisma.calendarConnection.updateMany({
      where: { id, organizationId },
      data: input,
    });
  }

  deleteByOrganization(organizationId: string) {
    return this.prisma.calendarConnection.deleteMany({
      where: { organizationId },
    });
  }
}
