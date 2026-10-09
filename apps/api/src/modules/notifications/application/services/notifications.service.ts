import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DomainEventTypes,
  NotificationTypeKeys,
  type EventEnvelope,
  type NotificationData,
  type NotificationPreferenceDto,
  type NotificationTypeKey,
} from '@agency-os/contracts';
import { DomainEventBus } from '../../../../shared/events/domain-event.bus';
import { AuditService } from '../../../audit/application/services/audit.service';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';

interface Delivery {
  recipientId: string;
  typeKey: NotificationTypeKey;
  data: NotificationData;
}

const IN_APP_CHANNEL = 'inApp';
const NOTIFICATION_TYPE_KEYS: readonly NotificationTypeKey[] =
  Object.values(NotificationTypeKeys);

const CONTENT_OUTCOME_TYPES: Readonly<Record<string, NotificationTypeKey>> = {
  APPROVED: NotificationTypeKeys.CONTENT_APPROVED,
  CHANGES_REQUESTED: NotificationTypeKeys.CONTENT_CHANGES_REQUESTED,
};

function text(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value ? value : undefined;
}

/** A missing preference or channel means the default: enabled. */
function inAppEnabled(channels: unknown): boolean {
  if (!channels || typeof channels !== 'object' || Array.isArray(channels))
    return true;
  return (channels as Record<string, unknown>)[IN_APP_CHANNEL] !== false;
}

/** Maps a domain event to the person who should hear about it. */
function deliveryFor(event: EventEnvelope): Delivery | undefined {
  const { payload } = event;
  switch (event.type) {
    case DomainEventTypes.TASK_ASSIGNED: {
      const recipientId = text(payload, 'assigneeUserId');
      if (!recipientId) return undefined;
      return {
        recipientId,
        typeKey: NotificationTypeKeys.TASK_ASSIGNED,
        data: {
          taskId: text(payload, 'taskId'),
          title: text(payload, 'title'),
        },
      };
    }
    case DomainEventTypes.CONTENT_STATE_CHANGED: {
      const recipientId = text(payload, 'createdById');
      const typeKey = CONTENT_OUTCOME_TYPES[text(payload, 'toStatus') ?? ''];
      if (!recipientId || !typeKey) return undefined;
      return {
        recipientId,
        typeKey,
        data: {
          contentId: text(payload, 'contentId'),
          title: text(payload, 'title'),
        },
      };
    }
    default:
      return undefined;
  }
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly eventBus: DomainEventBus,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    for (const type of [
      DomainEventTypes.TASK_ASSIGNED,
      DomainEventTypes.CONTENT_STATE_CHANGED,
    ]) {
      this.eventBus.subscribe(type, (event) => this.handleDomainEvent(event));
    }
  }

  list(organizationId: string, recipientId: string) {
    return this.repository.listForUser(organizationId, recipientId);
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
    return NOTIFICATION_TYPE_KEYS.map((typeKey) => ({
      typeKey,
      enabled: inAppEnabled(stored.get(typeKey)),
    }));
  }

  async setPreference(
    organizationId: string,
    userId: string,
    typeKey: NotificationTypeKey,
    enabled: boolean,
  ): Promise<NotificationPreferenceDto> {
    await this.repository.upsertPreference(organizationId, userId, typeKey, {
      [IN_APP_CHANNEL]: enabled,
    });
    await this.audit.record({
      organizationId,
      actorId: userId,
      actorType: 'user',
      action: 'notification.preference_update',
      entityType: 'notification_preference',
      entityId: userId,
      after: { typeKey, enabled },
    });
    return { typeKey, enabled };
  }

  private async handleDomainEvent(event: EventEnvelope): Promise<void> {
    const delivery = deliveryFor(event);
    if (!delivery || delivery.recipientId === event.actor.id) return;
    const { organizationId } = event;
    const preference = await this.repository.findPreference(
      organizationId,
      delivery.recipientId,
      delivery.typeKey,
    );
    if (!inAppEnabled(preference?.channels)) return;
    if (await this.repository.existsForEvent(organizationId, event.id)) return;
    await this.repository.create({
      organizationId,
      recipientId: delivery.recipientId,
      typeKey: delivery.typeKey,
      title: delivery.data.title ?? '',
      body: '',
      data: { ...delivery.data, eventId: event.id },
    });
  }
}
