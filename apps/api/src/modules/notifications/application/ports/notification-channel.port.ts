import type {
  NotificationChannel,
  NotificationData,
  NotificationTypeKey,
} from '@agency-os/contracts';

/** A notification ready to leave the system, with copy already rendered for the recipient. */
export interface OutboundNotification {
  id: string;
  organizationId: string;
  recipientId: string;
  typeKey: NotificationTypeKey;
  subject: string;
  body: string;
  actionLabel: string;
  data: NotificationData;
  readAt: Date | null;
  createdAt: Date;
}

export type ChannelDeliveryStatus = 'SENT' | 'SKIPPED';

export interface ChannelDeliveryResult {
  status: ChannelDeliveryStatus;
  providerRef?: string;
  reason?: string;
}

/** Channel adapters are the only code that talks to delivery providers; throwing triggers a retry. */
export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  isAvailable(): boolean;
  deliver(notification: OutboundNotification): Promise<ChannelDeliveryResult>;
}

export const NOTIFICATION_CHANNEL_ADAPTERS = Symbol(
  'NOTIFICATION_CHANNEL_ADAPTERS',
);
