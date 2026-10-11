import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import { EmailService } from '../../../../shared/notifications/email.service';
import { IdentityService } from '../../../identity/application/services/identity.service';
import type {
  ChannelDeliveryResult,
  NotificationChannelAdapter,
  OutboundNotification,
} from '../../application/ports/notification-channel.port';

@Injectable()
export class EmailChannel implements NotificationChannelAdapter {
  readonly channel = 'email' as const;

  constructor(
    private readonly email: EmailService,
    private readonly identity: IdentityService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  isAvailable(): boolean {
    return this.config.get('NOTIFICATION_EMAIL_ENABLED', { infer: true });
  }

  async deliver(
    notification: OutboundNotification,
  ): Promise<ChannelDeliveryResult> {
    const contact = await this.identity.findContact(notification.recipientId);
    if (!contact) return { status: 'SKIPPED', reason: 'recipient not found' };
    const webBase = this.config.get('WEB_APP_URL', { infer: true });
    const href = notification.data.href?.trim();
    const actionUrl = href
      ? href.startsWith('http')
        ? href
        : new URL(href.startsWith('/') ? href : `/${href}`, webBase).toString()
      : new URL(
          this.config.get('NOTIFICATION_LINK_PATH', { infer: true }),
          webBase,
        ).toString();
    await this.email.sendNotification({
      to: contact.email,
      subject: notification.subject,
      body: notification.body,
      actionUrl,
      actionLabel: notification.actionLabel,
    });
    return { status: 'SENT' };
  }
}
