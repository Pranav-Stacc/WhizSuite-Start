import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NotificationChannel } from '@agency-os/contracts';
import type { Job } from 'bullmq';
import type { AppConfig } from '../../../shared/config/app.config';
import {
  NOTIFICATION_CHANNEL_ADAPTERS,
  type NotificationChannelAdapter,
} from '../application/ports/notification-channel.port';
import { toOutboundNotification } from '../application/services/outbound-notification';
import {
  DeliveryStatuses,
  NotificationsRepository,
} from '../infrastructure/repositories/notifications.repository';
import {
  NOTIFICATION_DELIVERY_QUEUE,
  type NotificationDeliveryJob,
} from './notification-delivery.queue';

const FINISHED: ReadonlySet<string> = new Set([
  DeliveryStatuses.SENT,
  DeliveryStatuses.SKIPPED,
]);

@Processor(NOTIFICATION_DELIVERY_QUEUE)
export class NotificationDeliveryProcessor
  extends WorkerHost
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(NotificationDeliveryProcessor.name);
  private readonly adapters: ReadonlyMap<
    NotificationChannel,
    NotificationChannelAdapter
  >;

  constructor(
    private readonly repository: NotificationsRepository,
    @Inject(NOTIFICATION_CHANNEL_ADAPTERS)
    adapters: NotificationChannelAdapter[],
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    super();
    this.adapters = new Map(adapters.map((a) => [a.channel, a]));
  }

  onApplicationBootstrap(): void {
    this.worker.concurrency = this.config.get(
      'NOTIFICATION_DELIVERY_CONCURRENCY',
      { infer: true },
    );
  }

  async process(job: Job<NotificationDeliveryJob>): Promise<void> {
    const delivery = await this.repository.findDelivery(job.data.deliveryId);
    if (!delivery || FINISHED.has(delivery.status)) return;

    const adapter = this.adapters.get(delivery.channel as NotificationChannel);
    if (!adapter?.isAvailable()) {
      await this.repository.updateDelivery(delivery.id, {
        status: DeliveryStatuses.SKIPPED,
        error: 'channel unavailable',
      });
      return;
    }
    const result = await adapter.deliver(
      toOutboundNotification(delivery.notification),
    );
    await this.repository.updateDelivery(delivery.id, {
      status: result.status,
      providerRef: result.providerRef,
      error: result.reason,
    });
  }

  /** After the final retry the job stays in BullMQ's failed set (the dead-letter store) and is alerted on. */
  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<NotificationDeliveryJob>,
    error: Error,
  ): Promise<void> {
    if (job.attemptsMade < (job.opts.attempts ?? 1)) return;
    await this.repository.updateDelivery(job.data.deliveryId, {
      status: DeliveryStatuses.FAILED,
      error: error.message,
    });
    this.logger.error(
      {
        deliveryId: job.data.deliveryId,
        organizationId: job.data.organizationId,
        err: error,
      },
      'Notification delivery dead-lettered',
    );
  }
}
