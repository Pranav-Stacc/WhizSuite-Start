import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import { CalendarRepository } from '../../infrastructure/repositories/calendar.repository';
import type {
  CreateCalendarItemDto,
  UpdateCalendarItemDto,
} from '../../interface/http/dto/calendar-item.dto';

const ENTITY_TYPE = 'calendarItem';

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

@Injectable()
export class CalendarService {
  constructor(
    private readonly repository: CalendarRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
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
    const item = await this.repository.create(organizationId, {
      ...input,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'calendar/items.create',
      entityType: ENTITY_TYPE,
      entityId: item.id,
      after: { title: item.title, startsAt: item.startsAt.toISOString() },
    });
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
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'calendar/items.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { title: before.title, startsAt: before.startsAt.toISOString() },
      after: { ...input },
    });
    return this.get(organizationId, id);
  }
}
