import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(organizationId: string, recipientId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { organizationId, recipientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  create(data: {
    organizationId: string;
    recipientId: string;
    typeKey: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        recipientId: data.recipientId,
        typeKey: data.typeKey,
        title: data.title,
        body: data.body,
        data: toInputJson(data.data),
      },
    });
  }

  markRead(organizationId: string, id: string, recipientId: string) {
    return this.prisma.notification.updateMany({
      where: { id, organizationId, recipientId },
      data: { readAt: new Date() },
    });
  }

  markAllRead(organizationId: string, recipientId: string) {
    return this.prisma.notification.updateMany({
      where: { organizationId, recipientId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  listPreferences(organizationId: string, userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { organizationId, userId },
      select: { typeKey: true, channels: true },
    });
  }

  findPreference(organizationId: string, userId: string, typeKey: string) {
    return this.prisma.notificationPreference.findUnique({
      where: {
        organizationId_userId_typeKey: { organizationId, userId, typeKey },
      },
      select: { channels: true },
    });
  }

  upsertPreference(
    organizationId: string,
    userId: string,
    typeKey: string,
    channels: Record<string, boolean>,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: {
        organizationId_userId_typeKey: { organizationId, userId, typeKey },
      },
      create: { organizationId, userId, typeKey, channels },
      update: { channels },
    });
  }

  /** Consumers are at-least-once; the source event id makes delivery idempotent. */
  existsForEvent(organizationId: string, eventId: string): Promise<boolean> {
    return this.prisma.notification
      .count({
        where: { organizationId, data: { path: ['eventId'], equals: eventId } },
      })
      .then((count) => count > 0);
  }
}
