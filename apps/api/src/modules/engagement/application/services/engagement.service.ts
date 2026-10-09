import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DomainEventTypes,
  type InboxConversationDto,
  type InboxConversationStatus,
  type InboxConversationType,
  type InboxMessageDirection,
  type InboxPriority,
  type InboxSentiment,
} from '@agency-os/contracts';
import type { InboxMessage } from '@prisma/client';
import type { AppConfig } from '../../../../shared/config/app.config';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import {
  EngagementRepository,
  type ConversationRecord,
  type ConversationUpdateRow,
} from '../../infrastructure/repositories/engagement.repository';
import type {
  CreateConversationDto,
  ReplyConversationDto,
  UpdateConversationDto,
} from '../../interface/http/dto/conversation.dto';

const OPEN: InboxConversationStatus = 'OPEN';
const REPLIED: InboxConversationStatus = 'REPLIED';
const ARCHIVED: InboxConversationStatus = 'ARCHIVED';
const INBOUND: InboxMessageDirection = 'INBOUND';
const OUTBOUND: InboxMessageDirection = 'OUTBOUND';
const ENTITY_TYPE = 'inboxConversation';

function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function toMessageDto(message: InboxMessage) {
  return {
    id: message.id,
    direction: message.direction as InboxMessageDirection,
    body: message.body,
    authorId: message.authorId,
    createdAt: message.createdAt.toISOString(),
  };
}

function toDto(
  record: ConversationRecord,
  withMessages: boolean,
): InboxConversationDto {
  const latest = record.messages.at(-1) ?? null;
  return {
    id: record.id,
    clientId: record.clientId,
    type: record.type as InboxConversationType,
    status: record.status as InboxConversationStatus,
    priority: record.priority as InboxPriority,
    sentiment: (record.sentiment as InboxSentiment | null) ?? null,
    authorHandle: record.authorHandle,
    assigneeId: record.assigneeId,
    preview: latest?.body ?? null,
    firstResponseAt: toIso(record.firstResponseAt),
    resolvedAt: toIso(record.resolvedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(withMessages ? { messages: record.messages.map(toMessageDto) } : {}),
  };
}

@Injectable()
export class EngagementService {
  constructor(
    private readonly repository: EngagementRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string): Promise<InboxConversationDto[]> {
    const rows = await this.repository.list(
      organizationId,
      this.config.get('INBOX_LIST_LIMIT', { infer: true }),
      TenantContext.clientScope(),
    );
    return rows.map((row) => toDto(row, false));
  }

  async get(organizationId: string, id: string): Promise<InboxConversationDto> {
    return toDto(await this.find(organizationId, id), true);
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateConversationDto,
  ) {
    const created = await this.repository.create(
      organizationId,
      {
        clientId: input.clientId,
        type: input.type,
        status: OPEN,
        authorHandle: input.authorHandle,
        priority: input.priority,
        sentiment: input.sentiment,
        slaDueAt: input.slaDueAt ? new Date(input.slaDueAt) : undefined,
      },
      input.body
        ? { direction: INBOUND, body: input.body, authorType: 'external' }
        : undefined,
    );
    await this.outbox.write({
      type: DomainEventTypes.INBOX_MESSAGE_RECEIVED,
      version: 1,
      organizationId,
      payload: { conversationId: created.id, clientId: created.clientId },
      actor: { id: actorId, type: 'user' },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'inbox/conversations.create',
      entityType: ENTITY_TYPE,
      entityId: created.id,
      after: { clientId: created.clientId, type: created.type },
    });
    return this.get(organizationId, created.id);
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateConversationDto,
  ) {
    const before = await this.find(organizationId, id);
    const row: ConversationUpdateRow = {
      status: input.status,
      assigneeId: input.assigneeId,
      priority: input.priority,
      sentiment: input.sentiment,
    };
    if (input.status)
      row.resolvedAt = input.status === ARCHIVED ? new Date() : null;
    await this.repository.update(organizationId, id, row);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'inbox/conversations.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: {
        status: before.status,
        assigneeId: before.assigneeId,
        priority: before.priority,
      },
      after: { ...input },
    });
    return this.get(organizationId, id);
  }

  async reply(
    organizationId: string,
    actorId: string,
    id: string,
    input: ReplyConversationDto,
  ) {
    const before = await this.find(organizationId, id);
    const message = await this.repository.addMessage(
      organizationId,
      id,
      {
        direction: OUTBOUND,
        body: input.body,
        authorType: 'user',
        authorId: actorId,
      },
      {
        status: REPLIED,
        assigneeId: before.assigneeId ?? actorId,
        ...(before.firstResponseAt ? {} : { firstResponseAt: new Date() }),
      },
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'inbox/conversations.reply',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { status: before.status },
      after: { status: REPLIED, messageId: message.id },
    });
    return this.get(organizationId, id);
  }

  private async find(
    organizationId: string,
    id: string,
  ): Promise<ConversationRecord> {
    const record = await this.repository.findById(organizationId, id);
    if (!record || !TenantContext.canAccessClient(record.clientId))
      throw notFound();
    return record;
  }
}
