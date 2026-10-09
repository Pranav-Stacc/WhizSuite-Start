import { Injectable } from '@nestjs/common';
import { RealtimeEvents, type NotificationDto } from '@agency-os/contracts';
import { RealtimeService } from '../../../realtime/application/services/realtime.service';
import type {
  ChannelDeliveryResult,
  NotificationChannelAdapter,
  OutboundNotification,
} from '../../application/ports/notification-channel.port';

/** The record is already persisted; this channel pushes it live to the recipient's open sessions. */
@Injectable()
export class InAppChannel implements NotificationChannelAdapter {
  readonly channel = 'inApp' as const;

  constructor(private readonly realtime: RealtimeService) {}

  isAvailable(): boolean {
    return true;
  }

  deliver(notification: OutboundNotification): Promise<ChannelDeliveryResult> {
    const dto: NotificationDto = {
      id: notification.id,
      typeKey: notification.typeKey,
      title: notification.data.title ?? '',
      body: notification.body,
      data: notification.data,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
    this.realtime.publishToUser(
      notification.organizationId,
      notification.recipientId,
      RealtimeEvents.NOTIFICATION_CREATED,
      dto,
    );
    return Promise.resolve({ status: 'SENT' });
  }
}
