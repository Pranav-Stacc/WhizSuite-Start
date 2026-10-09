import { Injectable } from '@nestjs/common';
import type { NotificationChannel } from '@agency-os/contracts';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

export const DeliveryStatuses = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED',
} as const;
export type DeliveryStatus =
  (typeof DeliveryStatuses)[keyof typeof DeliveryStatuses];

const NOTIFICATION_SELECT = {
  id: true,
  organizationId: true,
  recipientId: true,
  typeKey: true,
  title: true,
  body: true,
  data: true,
  readAt: true,
  createdAt: true,
} as const;

const DEVICE_SELECT = {
  id: true,
  platform: true,
  appVersion: true,
  lastSeenAt: true,
} as const;

export interface NotificationCreateRow {
  organizationId: string;
  recipientId: string;
  typeKey: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: Date | null;
}

export interface DeviceUpsertRow {
  organizationId: string;
  userId: string;
  token: string;
  platform: string;
  appVersion?: string;
  locale?: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(organizationId: string, recipientId: string, limit: number) {
    return this.prisma.notification.findMany({
      where: { organizationId, recipientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: NOTIFICATION_SELECT,
    });
  }

  /** Persists the notification together with one QUEUED delivery per channel. */
  createWithDeliveries(
    row: NotificationCreateRow,
    channels: readonly NotificationChannel[],
  ) {
    return this.prisma.notification.create({
      data: {
        ...row,
        data: toInputJson(row.data),
        deliveries: {
          create: channels.map((channel) => ({
            organizationId: row.organizationId,
            channel,
            status: DeliveryStatuses.QUEUED,
          })),
        },
      },
      select: {
        ...NOTIFICATION_SELECT,
        deliveries: { select: { id: true, channel: true } },
      },
    });
  }

  findDelivery(deliveryId: string) {
    return this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        channel: true,
        status: true,
        notification: { select: NOTIFICATION_SELECT },
      },
    });
  }

  updateDelivery(
    deliveryId: string,
    change: { status: DeliveryStatus; providerRef?: string; error?: string },
  ) {
    return this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        ...change,
        sentAt:
          change.status === DeliveryStatuses.SENT ? new Date() : undefined,
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
  async existsForEvent(
    organizationId: string,
    eventId: string,
  ): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: { organizationId, data: { path: ['eventId'], equals: eventId } },
    });
    return count > 0;
  }

  /** Tokens are device-global: registering moves an existing token to the current user/org. */
  upsertDevice(row: DeviceUpsertRow) {
    const fields = { ...row, lastSeenAt: new Date() };
    return this.prisma.device.upsert({
      where: { token: row.token },
      create: fields,
      update: fields,
      select: DEVICE_SELECT,
    });
  }

  /** Keeps only the `keep` most recently seen devices of a user. */
  async pruneDevices(
    organizationId: string,
    userId: string,
    keep: number,
  ): Promise<void> {
    const stale = await this.prisma.device.findMany({
      where: { organizationId, userId },
      orderBy: { lastSeenAt: 'desc' },
      skip: keep,
      select: { id: true },
    });
    if (stale.length === 0) return;
    await this.prisma.device.deleteMany({
      where: { id: { in: stale.map((d) => d.id) } },
    });
  }

  listDevices(organizationId: string, userId: string) {
    return this.prisma.device.findMany({
      where: { organizationId, userId },
      orderBy: { lastSeenAt: 'desc' },
      select: DEVICE_SELECT,
    });
  }

  async listDeviceTokens(
    organizationId: string,
    userId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.device.findMany({
      where: { organizationId, userId },
      select: { token: true },
    });
    return rows.map((r) => r.token);
  }

  async deleteDevice(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.device.deleteMany({
      where: { id, organizationId, userId },
    });
    return count > 0;
  }

  deleteTokens(tokens: string[]) {
    return this.prisma.device.deleteMany({ where: { token: { in: tokens } } });
  }
}
