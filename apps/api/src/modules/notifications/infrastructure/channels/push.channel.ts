import { Inject, Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';
import type {
  ChannelDeliveryResult,
  NotificationChannelAdapter,
  OutboundNotification,
} from '../../application/ports/notification-channel.port';
import {
  PUSH_PROVIDER,
  type PushProvider,
} from '../../application/ports/push-provider.port';

function pushData(notification: OutboundNotification): Record<string, string> {
  const data: Record<string, string> = {
    notificationId: notification.id,
    organizationId: notification.organizationId,
    typeKey: notification.typeKey,
  };
  for (const [key, value] of Object.entries(notification.data)) {
    if (typeof value === 'string') data[key] = value;
  }
  return data;
}

@Injectable()
export class PushChannel implements NotificationChannelAdapter {
  readonly channel = 'push' as const;

  constructor(
    @Inject(PUSH_PROVIDER) private readonly provider: PushProvider,
    private readonly repository: NotificationsRepository,
  ) {}

  isAvailable(): boolean {
    return this.provider.isEnabled();
  }

  async deliver(
    notification: OutboundNotification,
  ): Promise<ChannelDeliveryResult> {
    const tokens = await this.repository.listDeviceTokens(
      notification.organizationId,
      notification.recipientId,
    );
    if (tokens.length === 0)
      return { status: 'SKIPPED', reason: 'no registered devices' };

    const result = await this.provider.send(tokens, {
      title: notification.subject,
      body: notification.body,
      data: pushData(notification),
    });
    if (result.invalidTokens.length > 0)
      await this.repository.deleteTokens(result.invalidTokens);
    if (result.successCount > 0)
      return {
        status: 'SENT',
        providerRef: `${result.successCount}/${tokens.length}`,
      };
    if (result.invalidTokens.length === tokens.length)
      return { status: 'SKIPPED', reason: 'all device tokens invalid' };
    throw new Error(`Push delivery failed for all ${tokens.length} devices`);
  }
}
