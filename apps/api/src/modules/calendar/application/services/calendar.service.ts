import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainEventTypes } from '@agency-os/contracts';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../../../shared/config/app.config';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import { CalendarRepository } from '../../infrastructure/repositories/calendar.repository';
import type {
  CreateCalendarItemDto,
  UpdateCalendarItemDto,
} from '../../interface/http/dto/calendar-item.dto';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

const ENTITY_TYPE = 'calendarItem';
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

@Injectable()
export class CalendarService {
  constructor(
    private readonly repository: CalendarRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly googleSync: GoogleCalendarSyncService,
    private readonly outbox: OutboxService,
  ) {}

  list(organizationId: string) {
    return this.repository.list(
      organizationId,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
      TenantContext.clientScope(),
    );
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (!item || !TenantContext.canAccessClient(item.clientId))
      throw notFound();
    return item;
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateCalendarItemDto,
  ) {
    if (input.clientId && !TenantContext.canAccessClient(input.clientId)) {
      throw notFound('Client not found');
    }

    const connection = await this.googleSync.getConnection(organizationId);
    const syncToGoogle = this.googleSync.resolveSyncToGoogle(
      connection,
      input.sourceType,
      input.syncToGoogle,
    );

    const sourceId = input.sourceId ?? randomUUID();
    const metadata = {
      ...(input.metadata ?? {}),
      reminderUserIds: [
        actorId,
        ...reminderUserIdsFromMetadata(input.metadata),
      ].filter((id, index, ids) => ids.indexOf(id) === index),
    };
    const item = await this.repository.create(organizationId, {
      sourceType: input.sourceType,
      sourceId,
      title: input.title,
      allDay: input.allDay,
      clientId: input.clientId,
      projectId: input.projectId,
      metadata,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      syncToGoogle,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'calendar/items.create',
      entityType: ENTITY_TYPE,
      entityId: item.id,
      after: {
        title: item.title,
        startsAt: item.startsAt.toISOString(),
        syncToGoogle,
      },
    });
    await this.googleSync.enqueueIfNeeded(
      organizationId,
      item.id,
      syncToGoogle,
      actorId,
    );

    const recipientIds = reminderUserIdsFromMetadata(metadata);
    if (recipientIds.length > 0) {
      await this.outbox.write({
        type: DomainEventTypes.CALENDAR_ITEM_CREATED,
        version: 1,
        organizationId,
        payload: {
          title: item.title,
          startsAt: item.startsAt.toISOString(),
          calendarItemId: item.id,
          recipientIds,
          reminderKey: `calendar.created:${item.id}`,
        },
        actor: { id: SYSTEM_ACTOR_ID, type: 'system' },
      });
    }

    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateCalendarItemDto,
  ) {
    const before = await this.get(organizationId, id);
    await this.repository.update(organizationId, id, {
      title: input.title,
      allDay: input.allDay,
      metadata: input.metadata,
      startsAt: toDate(input.startsAt) ?? undefined,
      endsAt: toDate(input.endsAt),
      syncToGoogle: input.syncToGoogle,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'calendar/items.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: {
        title: before.title,
        startsAt: before.startsAt.toISOString(),
        syncToGoogle: before.syncToGoogle,
      },
      after: { ...input },
    });
    const updated = await this.get(organizationId, id);
    await this.googleSync.enqueueIfNeeded(
      organizationId,
      id,
      updated.syncToGoogle,
      actorId,
    );
    return updated;
  }
}

function reminderUserIdsFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const raw = (metadata as { reminderUserIds?: unknown }).reminderUserIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
}
