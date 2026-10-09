import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsSharedModule } from '../../shared/notifications/notifications-shared.module';
import { IdentityModule } from '../identity/identity.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NOTIFICATION_CHANNEL_ADAPTERS } from './application/ports/notification-channel.port';
import { PUSH_PROVIDER } from './application/ports/push-provider.port';
import { DevicesService } from './application/services/devices.service';
import { NotificationsService } from './application/services/notifications.service';
import { EmailChannel } from './infrastructure/channels/email.channel';
import { InAppChannel } from './infrastructure/channels/in-app.channel';
import { PushChannel } from './infrastructure/channels/push.channel';
import { FcmPushProvider } from './infrastructure/push/fcm-push.provider';
import { NotificationsRepository } from './infrastructure/repositories/notifications.repository';
import { NotificationsResourceController } from './interface/http/controllers/notifications-resource.controller';
import { NotificationDeliveryProcessor } from './jobs/notification-delivery.processor';
import { NOTIFICATION_DELIVERY_QUEUE } from './jobs/notification-delivery.queue';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATION_DELIVERY_QUEUE }),
    NotificationsSharedModule,
    IdentityModule,
    RealtimeModule,
  ],
  controllers: [NotificationsResourceController],
  providers: [
    NotificationsService,
    DevicesService,
    NotificationsRepository,
    InAppChannel,
    EmailChannel,
    PushChannel,
    { provide: PUSH_PROVIDER, useClass: FcmPushProvider },
    {
      provide: NOTIFICATION_CHANNEL_ADAPTERS,
      useFactory: (
        inApp: InAppChannel,
        email: EmailChannel,
        push: PushChannel,
      ) => [inApp, email, push],
      inject: [InAppChannel, EmailChannel, PushChannel],
    },
    NotificationDeliveryProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
