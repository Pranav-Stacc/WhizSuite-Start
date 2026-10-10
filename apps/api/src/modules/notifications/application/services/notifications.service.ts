import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DomainEventTypes,
  NotificationChannels,
  NotificationTypeKeys,
  type EventEnvelope,
  type NotificationData,
  type NotificationDto,
  type NotificationPreferenceDto,
  type NotificationPreferenceUpdateInput,
  type NotificationTypeKey,
} from '@agency-os/contracts';
import type { Queue } from 'bullmq';
import type { AppConfig } from '../../../../shared/config/app.config';
import { DomainEventBus } from '../../../../shared/events/domain-event.bus';
import { AuditService } from '../../../audit/application/services/audit.service';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';
import {
  NOTIFICATION_DELIVERY_JOB,
  NOTIFICATION_DELIVERY_QUEUE,
  type NotificationDeliveryJob,
} from '../../jobs/notification-delivery.queue';
import {
  NOTIFICATION_CHANNEL_ADAPTERS,
  type NotificationChannelAdapter,
} from '../ports/notification-channel.port';
import { resolveChannels } from './notification-channels';
import type { StoredNotification } from './outbound-notification';

interface Delivery {
  recipientId: string;
  typeKey: NotificationTypeKey;
  data: NotificationData;
}

const NOTIFICATION_TYPE_KEYS: readonly NotificationTypeKey[] =
  Object.values(NotificationTypeKeys);

const CONTENT_OUTCOME_TYPES: Readonly<Record<string, NotificationTypeKey>> = {
  APPROVED: NotificationTypeKeys.CONTENT_APPROVED,
  CHANGES_REQUESTED: NotificationTypeKeys.CONTENT_CHANGES_REQUESTED,
  REJECTED: NotificationTypeKeys.CONTENT_REJECTED,
};

const APPROVAL_OUTCOME_TYPES: Readonly<Record<string, NotificationTypeKey>> = {
  APPROVED: NotificationTypeKeys.APPROVAL_COMPLETED,
  REJECTED: NotificationTypeKeys.APPROVAL_REJECTED,
  CHANGES_REQUESTED: NotificationTypeKeys.APPROVAL_CHANGES_REQUESTED,
};

const SUBSCRIBED_EVENTS = [
  DomainEventTypes.TASK_ASSIGNED,
  DomainEventTypes.TASK_STATE_CHANGED,
  DomainEventTypes.TASK_COMMENTED,
  DomainEventTypes.TASK_DUE_SOON,
  DomainEventTypes.TASK_OVERDUE,
  DomainEventTypes.CONTENT_STATE_CHANGED,
  DomainEventTypes.CONTENT_SCHEDULED,
  DomainEventTypes.APPROVAL_REQUESTED,
  DomainEventTypes.APPROVAL_COMPLETED,
  DomainEventTypes.APPROVAL_REMINDER,
  DomainEventTypes.CHAT_MESSAGE_CREATED,
  DomainEventTypes.CHAT_MEMBER_MENTIONED,
  DomainEventTypes.SOCIAL_POST_PUBLISHED,
  DomainEventTypes.SOCIAL_POST_FAILED,
  DomainEventTypes.SOCIAL_ACCOUNT_DISCONNECTED,
  DomainEventTypes.INVITATION_ACCEPTED,
  DomainEventTypes.AUTOMATION_NOTIFY,
  DomainEventTypes.FEEDBACK_CREATED,
  DomainEventTypes.INVOICE_PAID,
  DomainEventTypes.INVOICE_OVERDUE,
  DomainEventTypes.CALENDAR_REMINDER_DUE,
] as const;

function text(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value ? value : undefined;
}

function recipientIdsOf(payload: Record<string, unknown>): string[] {
  const raw = payload.recipientIds;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw.filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
}

function baseData(
  payload: Record<string, unknown>,
  extra: NotificationData = {},
): NotificationData {
  return {
    title: text(payload, 'title'),
    reminderKey: text(payload, 'reminderKey'),
    ...extra,
  };
}

/** Maps a domain event to the people who should hear about it. */
function deliveriesFor(event: EventEnvelope): Delivery[] {
  const { payload } = event;
  switch (event.type) {
    case DomainEventTypes.TASK_ASSIGNED: {
      const recipientId = text(payload, 'assigneeUserId');
      if (!recipientId) return [];
      return [
        {
          recipientId,
          typeKey: NotificationTypeKeys.TASK_ASSIGNED,
          data: baseData(payload, { taskId: text(payload, 'taskId') }),
        },
      ];
    }
    case DomainEventTypes.TASK_STATE_CHANGED: {
      const data = baseData(payload, {
        taskId: text(payload, 'taskId'),
        fromStatus: text(payload, 'fromStatus'),
        toStatus: text(payload, 'toStatus'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.TASK_STATE_CHANGED,
        data,
      }));
    }
    case DomainEventTypes.TASK_COMMENTED: {
      const data = baseData(payload, { taskId: text(payload, 'taskId') });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.TASK_COMMENTED,
        data,
      }));
    }
    case DomainEventTypes.TASK_DUE_SOON: {
      const data = baseData(payload, { taskId: text(payload, 'taskId') });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.TASK_DUE_SOON,
        data,
      }));
    }
    case DomainEventTypes.TASK_OVERDUE: {
      const data = baseData(payload, { taskId: text(payload, 'taskId') });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.TASK_OVERDUE,
        data,
      }));
    }
    case DomainEventTypes.CONTENT_STATE_CHANGED: {
      const recipientId = text(payload, 'createdById');
      const typeKey = CONTENT_OUTCOME_TYPES[text(payload, 'toStatus') ?? ''];
      if (!recipientId || !typeKey) return [];
      return [
        {
          recipientId,
          typeKey,
          data: baseData(payload, {
            contentId: text(payload, 'contentId'),
            toStatus: text(payload, 'toStatus'),
          }),
        },
      ];
    }
    case DomainEventTypes.CONTENT_SCHEDULED: {
      const recipientId = text(payload, 'createdById');
      if (!recipientId) return [];
      return [
        {
          recipientId,
          typeKey: NotificationTypeKeys.CONTENT_SCHEDULED,
          data: baseData(payload, { contentId: text(payload, 'contentId') }),
        },
      ];
    }
    case DomainEventTypes.APPROVAL_REQUESTED: {
      const data = baseData(payload, {
        approvalRequestId: text(payload, 'approvalRequestId'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.APPROVAL_REQUESTED,
        data,
      }));
    }
    case DomainEventTypes.APPROVAL_COMPLETED: {
      const status = text(payload, 'status') ?? 'APPROVED';
      const typeKey =
        APPROVAL_OUTCOME_TYPES[status] ??
        NotificationTypeKeys.APPROVAL_COMPLETED;
      const data = baseData(payload, {
        approvalRequestId: text(payload, 'approvalRequestId'),
        toStatus: status,
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey,
        data,
      }));
    }
    case DomainEventTypes.APPROVAL_REMINDER: {
      const data = baseData(payload, {
        approvalRequestId: text(payload, 'approvalRequestId'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.APPROVAL_REMINDER,
        data,
      }));
    }
    case DomainEventTypes.CHAT_MESSAGE_CREATED: {
      const data = baseData(payload, {
        roomId: text(payload, 'roomId'),
        messageId: text(payload, 'messageId'),
        title: text(payload, 'preview') ?? text(payload, 'title'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.CHAT_MESSAGE,
        data,
      }));
    }
    case DomainEventTypes.CHAT_MEMBER_MENTIONED: {
      const data = baseData(payload, {
        roomId: text(payload, 'roomId'),
        messageId: text(payload, 'messageId'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.CHAT_MENTION,
        data,
      }));
    }
    case DomainEventTypes.SOCIAL_POST_PUBLISHED: {
      const recipientId = text(payload, 'createdById');
      if (!recipientId) return [];
      return [
        {
          recipientId,
          typeKey: NotificationTypeKeys.SOCIAL_POST_PUBLISHED,
          data: baseData(payload, { contentId: text(payload, 'contentId') }),
        },
      ];
    }
    case DomainEventTypes.SOCIAL_POST_FAILED: {
      const recipientId = text(payload, 'createdById');
      if (!recipientId) return [];
      return [
        {
          recipientId,
          typeKey: NotificationTypeKeys.SOCIAL_POST_FAILED,
          data: baseData(payload, { contentId: text(payload, 'contentId') }),
        },
      ];
    }
    case DomainEventTypes.SOCIAL_ACCOUNT_DISCONNECTED: {
      const data = baseData(payload, {
        socialAccountId: text(payload, 'socialAccountId'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.SOCIAL_ACCOUNT_DISCONNECTED,
        data,
      }));
    }
    case DomainEventTypes.INVITATION_ACCEPTED: {
      const recipientId = text(payload, 'invitedById');
      if (!recipientId) return [];
      return [
        {
          recipientId,
          typeKey: NotificationTypeKeys.INVITATION_ACCEPTED,
          data: baseData(payload, {
            invitationId: text(payload, 'invitationId'),
          }),
        },
      ];
    }
    case DomainEventTypes.AUTOMATION_NOTIFY: {
      const data = baseData(payload);
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.AUTOMATION_NOTIFY,
        data,
      }));
    }
    case DomainEventTypes.FEEDBACK_CREATED: {
      const data = baseData(payload, {
        feedbackThreadId: text(payload, 'threadId'),
        contentId: text(payload, 'contentId'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.FEEDBACK_COMMENT,
        data,
      }));
    }
    case DomainEventTypes.INVOICE_PAID: {
      const data = baseData(payload, {
        invoiceId: text(payload, 'invoiceId'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.INVOICE_PAID,
        data,
      }));
    }
    case DomainEventTypes.INVOICE_OVERDUE: {
      const data = baseData(payload, {
        invoiceId: text(payload, 'invoiceId'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.INVOICE_OVERDUE,
        data,
      }));
    }
    case DomainEventTypes.CALENDAR_REMINDER_DUE: {
      const data = baseData(payload, {
        calendarItemId: text(payload, 'calendarItemId'),
        startsAt: text(payload, 'startsAt'),
      });
      return recipientIdsOf(payload).map((recipientId) => ({
        recipientId,
        typeKey: NotificationTypeKeys.CALENDAR_REMINDER,
        data,
      }));
    }
    default:
      return [];
  }
}

function toDto(row: StoredNotification): NotificationDto {
  return {
    id: row.id,
    typeKey: row.typeKey as NotificationTypeKey,
    title: row.title,
    body: row.body,
    data: row.data ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly eventBus: DomainEventBus,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
    @InjectQueue(NOTIFICATION_DELIVERY_QUEUE)
    private readonly queue: Queue<NotificationDeliveryJob>,
    @Inject(NOTIFICATION_CHANNEL_ADAPTERS)
    private readonly adapters: NotificationChannelAdapter[],
  ) {}

  onModuleInit(): void {
    for (const type of SUBSCRIBED_EVENTS) {
      this.eventBus.subscribe(type, (event) => this.handleDomainEvent(event));
    }
  }

  async list(
    organizationId: string,
    recipientId: string,
  ): Promise<NotificationDto[]> {
    const limit = this.config.get('NOTIFICATION_LIST_LIMIT', { infer: true });
    const rows = await this.repository.listForUser(
      organizationId,
      recipientId,
      limit,
    );
    return rows.map(toDto);
  }

  markRead(
    organizationId: string,
    notificationId: string,
    recipientId: string,
  ) {
    return this.repository.markRead(
      organizationId,
      notificationId,
      recipientId,
    );
  }

  markAllRead(organizationId: string, recipientId: string) {
    return this.repository.markAllRead(organizationId, recipientId);
  }

  async preferences(
    organizationId: string,
    userId: string,
  ): Promise<NotificationPreferenceDto[]> {
    const stored = new Map(
      (await this.repository.listPreferences(organizationId, userId)).map(
        (p) => [p.typeKey, p.channels],
      ),
    );
    return NOTIFICATION_TYPE_KEYS.map((typeKey) =>
      this.preferenceDto(typeKey, stored.get(typeKey)),
    );
  }

  async setPreference(
    organizationId: string,
    userId: string,
    typeKey: NotificationTypeKey,
    input: NotificationPreferenceUpdateInput,
  ): Promise<NotificationPreferenceDto> {
    const current = await this.repository.findPreference(
      organizationId,
      userId,
      typeKey,
    );
    const before = this.preferenceDto(typeKey, current?.channels);
    const channels = {
      ...before.channels,
      ...input.channels,
      ...(input.enabled === undefined ? {} : { inApp: input.enabled }),
    };
    await this.repository.upsertPreference(
      organizationId,
      userId,
      typeKey,
      channels,
    );
    const after = this.preferenceDto(typeKey, channels);
    await this.audit.record({
      organizationId,
      actorId: userId,
      actorType: 'user',
      action: 'notification.preference_update',
      entityType: 'notification_preference',
      entityId: userId,
      before: { typeKey, ...before.channels },
      after: { typeKey, ...after.channels },
    });
    return after;
  }

  private preferenceDto(
    typeKey: NotificationTypeKey,
    stored: unknown,
  ): NotificationPreferenceDto {
    const channels = resolveChannels(
      stored,
      this.config.get('NOTIFICATION_DEFAULT_CHANNELS', { infer: true }),
    );
    return { typeKey, enabled: channels.inApp, channels };
  }

  /**
   * The notification row is the delivery record for every channel; when in-app is off it is stored
   * already read so it never surfaces as unread in the bell.
   */
  private async handleDomainEvent(event: EventEnvelope): Promise<void> {
    const deliveries = deliveriesFor(event).filter(
      (d) => d.recipientId !== event.actor.id,
    );
    if (deliveries.length === 0) return;
    const { organizationId } = event;
    const reminderKey = text(event.payload, 'reminderKey');
    if (reminderKey) {
      if (
        await this.repository.existsForReminderKey(organizationId, reminderKey)
      ) {
        return;
      }
    } else if (await this.repository.existsForEvent(organizationId, event.id)) {
      return;
    }

    const available = new Set(
      this.adapters.filter((a) => a.isAvailable()).map((a) => a.channel),
    );
    const deliveryIds: string[] = [];

    for (const delivery of deliveries) {
      const preference = await this.repository.findPreference(
        organizationId,
        delivery.recipientId,
        delivery.typeKey,
      );
      const settings = this.preferenceDto(
        delivery.typeKey,
        preference?.channels,
      ).channels;
      const channels = NotificationChannels.filter(
        (c) => settings[c] && available.has(c),
      );
      if (channels.length === 0) continue;

      const notification = await this.repository.createWithDeliveries(
        {
          organizationId,
          recipientId: delivery.recipientId,
          typeKey: delivery.typeKey,
          title: delivery.data.title ?? '',
          body: '',
          data: {
            ...delivery.data,
            eventId: event.id,
            ...(reminderKey ? { reminderKey } : {}),
          },
          readAt: settings.inApp ? null : new Date(),
        },
        channels,
      );
      deliveryIds.push(...notification.deliveries.map((d) => d.id));
    }

    if (deliveryIds.length > 0) {
      await this.enqueue(organizationId, deliveryIds);
    }
  }

  private async enqueue(
    organizationId: string,
    deliveryIds: string[],
  ): Promise<void> {
    const attempts = this.config.get('NOTIFICATION_DELIVERY_ATTEMPTS', {
      infer: true,
    });
    const delay = this.config.get('NOTIFICATION_DELIVERY_BACKOFF_MS', {
      infer: true,
    });
    const keepFailed = this.config.get('NOTIFICATION_DELIVERY_KEEP_FAILED', {
      infer: true,
    });
    try {
      await this.queue.addBulk(
        deliveryIds.map((deliveryId) => ({
          name: NOTIFICATION_DELIVERY_JOB,
          data: { deliveryId, organizationId },
          opts: {
            jobId: deliveryId,
            attempts,
            backoff: { type: 'exponential', delay },
            removeOnComplete: true,
            removeOnFail: { count: keepFailed },
          },
        })),
      );
    } catch (error) {
      this.logger.error(
        { err: error, organizationId, deliveryIds },
        'Failed to enqueue notification deliveries',
      );
    }
  }
}
