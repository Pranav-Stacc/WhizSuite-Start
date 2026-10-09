import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CHAT_PREVIEW_MAX_LENGTH,
  DomainEventTypes,
  ErrorCodes,
  RealtimeEvents,
  type ChatAttachmentDto,
  type ChatLinkPreviewDto,
  type ChatMemberDto,
  type ChatMemberRole,
  type ChatMentionDto,
  type ChatMessageDto,
  type ChatReactionDto,
  type ChatRoomDto,
  type ChatRoomType,
  type CursorPage,
} from '@agency-os/contracts';
import type { Prisma } from '@prisma/client';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  problem,
} from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import { RealtimeService } from '../../../realtime/application/services/realtime.service';
import { chatRoomChannel } from '../../../realtime/application/ports/realtime.port';
import {
  ChatRepository,
  type ChatMemberRecord,
  type ChatMessageRecord,
  type ChatRoomRecord,
  type MemberSeed,
} from '../../infrastructure/repositories/chat.repository';
import type {
  AddMembersDto,
  CreateDmDto,
  CreateGroupRoomDto,
  EditMessageDto,
  MarkReadDto,
  SendMessageDto,
  TypingDto,
  UpdateMembershipDto,
  UpdateRoomDto,
} from '../../interface/http/dto/chat.dto';

const ENTITY_ROOM = 'chatRoom';
const ENTITY_MESSAGE = 'chatMessage';

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function dmKeyFor(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function previewOf(body: string, hasAttachments: boolean): string {
  const trimmed = body.trim();
  if (trimmed) return trimmed.slice(0, CHAT_PREVIEW_MAX_LENGTH);
  return hasAttachments ? 'ðŸ“Ž Attachment' : '';
}

function capabilitiesFor(role: ChatMemberRole): Omit<
  MemberSeed,
  'userId' | 'role'
> {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return { canPost: true, canAddMembers: true, canManage: true };
    case 'GUEST':
      return { canPost: true, canAddMembers: false, canManage: false };
    default:
      return { canPost: true, canAddMembers: false, canManage: false };
  }
}

function toMemberDto(row: ChatMemberRecord): ChatMemberDto {
  return {
    userId: row.userId,
    role: row.role as ChatMemberRole,
    canPost: row.canPost,
    canAddMembers: row.canAddMembers,
    canManage: row.canManage,
    notificationLevel: row.notificationLevel as ChatMemberDto['notificationLevel'],
    mutedUntil: iso(row.mutedUntil),
    lastReadMessageId: row.lastReadMessageId,
    lastReadAt: iso(row.lastReadAt),
    pinnedAt: iso(row.pinnedAt),
    joinedAt: row.joinedAt.toISOString(),
  };
}

function toAttachmentDto(
  row: ChatMessageRecord['attachments'][number],
): ChatAttachmentDto {
  return {
    id: row.id,
    assetId: row.assetId,
    kind: row.kind as ChatAttachmentDto['kind'],
    sortOrder: row.sortOrder,
    url: row.url,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
    fileName: row.fileName,
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
  };
}

function toMentionDto(
  row: ChatMessageRecord['mentions'][number],
): ChatMentionDto {
  return {
    id: row.id,
    type: row.type as ChatMentionDto['type'],
    targetId: row.targetId,
    displayText: row.displayText,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
  };
}

function toReactions(
  rows: ChatMessageRecord['reactions'],
  viewerId: string,
): ChatReactionDto[] {
  const map = new Map<string, ChatReactionDto>();
  for (const row of rows) {
    const current = map.get(row.emoji) ?? {
      emoji: row.emoji,
      count: 0,
      viewerReacted: false,
    };
    current.count += 1;
    if (row.userId === viewerId) current.viewerReacted = true;
    map.set(row.emoji, current);
  }
  return [...map.values()];
}

function parseLinkPreview(value: Prisma.JsonValue | null): ChatLinkPreviewDto | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const url = value.url;
  if (typeof url !== 'string' || !url) return null;
  return {
    url,
    title: typeof value.title === 'string' ? value.title : null,
    description: typeof value.description === 'string' ? value.description : null,
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : null,
  };
}

function toMessageDto(row: ChatMessageRecord, viewerId: string): ChatMessageDto {
  const linkPreview = parseLinkPreview(row.linkPreview);
  return {
    id: row.id,
    roomId: row.roomId,
    senderId: row.senderId,
    clientMessageId: row.clientMessageId,
    type: row.type as ChatMessageDto['type'],
    body: row.deletedAt ? '' : row.body,
    replyToId: row.replyToId,
    linkPreview: row.deletedAt ? null : linkPreview,
    editedAt: iso(row.editedAt),
    deletedAt: iso(row.deletedAt),
    createdAt: row.createdAt.toISOString(),
    attachments: row.deletedAt ? [] : row.attachments.map(toAttachmentDto),
    mentions: row.deletedAt ? [] : row.mentions.map(toMentionDto),
    reactions: toReactions(row.reactions, viewerId),
  };
}

@Injectable()
export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private roomLimit() {
    return this.config.get('CHAT_ROOM_LIST_LIMIT', { infer: true });
  }

  private messageLimitDefault() {
    return this.config.get('CHAT_MESSAGE_PAGE_LIMIT', { infer: true });
  }

  private assertClientScope(clientId: string | null): void {
    if (!clientId) return;
    if (!TenantContext.canAccessClient(clientId)) throw notFound();
  }

  private async requireMembership(
    organizationId: string,
    roomId: string,
    userId: string,
  ) {
    const room = await this.repository.findRoom(organizationId, roomId);
    if (!room) throw notFound();
    this.assertClientScope(room.clientId);
    const membership = await this.repository.findMembership(
      organizationId,
      roomId,
      userId,
    );
    if (!membership) throw notFound();
    return { room, membership };
  }

  private async toRoomDto(
    organizationId: string,
    room: ChatRoomRecord,
    membership: ChatMemberRecord | null,
    withMembers = false,
  ): Promise<ChatRoomDto> {
    const unreadCount = membership
      ? await this.repository.countUnread(
          organizationId,
          room.id,
          membership.lastReadMessageId,
        )
      : 0;
    return {
      id: room.id,
      type: room.type as ChatRoomType,
      name: room.name,
      description: room.description,
      avatarAssetId: room.avatarAssetId,
      clientId: room.clientId,
      createdById: room.createdById,
      lastMessageAt: iso(room.lastMessageAt),
      lastMessagePreview: room.lastMessagePreview,
      lastMessageId: room.lastMessageId,
      memberCount: room.memberCount,
      unreadCount,
      viewerRole: (membership?.role as ChatMemberRole | undefined) ?? null,
      viewerCanPost: membership?.canPost ?? false,
      members: withMembers
        ? (await this.repository.listMembers(organizationId, room.id)).map(
            toMemberDto,
          )
        : undefined,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      archivedAt: iso(room.archivedAt),
    };
  }

  async listRooms(organizationId: string, userId: string): Promise<ChatRoomDto[]> {
    const rows = await this.repository.listRoomsForUser(
      organizationId,
      userId,
      this.roomLimit(),
    );
    const rooms: ChatRoomDto[] = [];
    for (const row of rows) {
      if (row.room.clientId && !TenantContext.canAccessClient(row.room.clientId)) {
        continue;
      }
      rooms.push(await this.toRoomDto(organizationId, row.room, row));
    }
    return rooms;
  }

  async unreadTotal(organizationId: string, userId: string): Promise<number> {
    const rows = await this.repository.totalUnreadForUser(organizationId, userId);
    return Number(rows[0]?.count ?? 0);
  }

  async getRoom(
    organizationId: string,
    userId: string,
    roomId: string,
  ): Promise<ChatRoomDto> {
    const { room, membership } = await this.requireMembership(
      organizationId,
      roomId,
      userId,
    );
    return this.toRoomDto(organizationId, room, membership, true);
  }

  async createGroup(
    organizationId: string,
    actorId: string,
    input: CreateGroupRoomDto,
  ): Promise<ChatRoomDto> {
    if (input.type === 'CLIENT') {
      if (!input.clientId) {
        throw problem(
          HttpStatus.BAD_REQUEST,
          'CLIENT rooms require clientId',
          ErrorCodes.VALIDATION_FAILED,
        );
      }
      this.assertClientScope(input.clientId);
      const existing = await this.repository.findClientRoom(
        organizationId,
        input.clientId,
      );
      if (existing) {
        await this.repository.addMembers(organizationId, existing.id, [
          {
            userId: actorId,
            role: 'ADMIN',
            ...capabilitiesFor('ADMIN'),
          },
        ]);
        return this.getRoom(organizationId, actorId, existing.id);
      }
    }

    const memberIds = [...new Set([actorId, ...input.memberUserIds])];
    const members: MemberSeed[] = memberIds.map((userId) => {
      const role: ChatMemberRole = userId === actorId ? 'OWNER' : 'MEMBER';
      return { userId, role, ...capabilitiesFor(role) };
    });

    const room = await this.repository.createRoom(organizationId, {
      type: input.type,
      name: input.name,
      description: input.description,
      clientId: input.type === 'CLIENT' ? input.clientId : null,
      createdById: actorId,
      members,
    });

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'chat/rooms.create',
      entityType: ENTITY_ROOM,
      entityId: room.id,
      after: { type: room.type, name: room.name, clientId: room.clientId },
    });
    await this.outbox.write({
      type: DomainEventTypes.CHAT_ROOM_UPDATED,
      version: 1,
      organizationId,
      payload: { roomId: room.id, action: 'created' },
      actor: { id: actorId, type: 'user' },
    });

    return this.getRoom(organizationId, actorId, room.id);
  }

  async getOrCreateDm(
    organizationId: string,
    actorId: string,
    input: CreateDmDto,
  ): Promise<ChatRoomDto> {
    if (input.userId === actorId) {
      throw problem(
        HttpStatus.BAD_REQUEST,
        'Cannot DM yourself',
        ErrorCodes.VALIDATION_FAILED,
      );
    }
    const key = dmKeyFor(actorId, input.userId);
    const existing = await this.repository.findDm(organizationId, key);
    if (existing) return this.getRoom(organizationId, actorId, existing.id);

    const room = await this.repository.createRoom(organizationId, {
      type: 'DM',
      dmKey: key,
      createdById: actorId,
      members: [
        { userId: actorId, role: 'OWNER', ...capabilitiesFor('OWNER') },
        { userId: input.userId, role: 'MEMBER', ...capabilitiesFor('MEMBER') },
      ],
    });

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'chat/rooms.create_dm',
      entityType: ENTITY_ROOM,
      entityId: room.id,
      after: { type: 'DM', dmKey: key },
    });

    return this.getRoom(organizationId, actorId, room.id);
  }

  async getOrCreateClientRoom(
    organizationId: string,
    actorId: string,
    clientId: string,
    name: string,
  ): Promise<ChatRoomDto> {
    this.assertClientScope(clientId);
    const existing = await this.repository.findClientRoom(
      organizationId,
      clientId,
    );
    if (existing) {
      const membership = await this.repository.findMembership(
        organizationId,
        existing.id,
        actorId,
      );
      if (!membership) {
        await this.repository.addMembers(organizationId, existing.id, [
          { userId: actorId, role: 'MEMBER', ...capabilitiesFor('MEMBER') },
        ]);
      }
      return this.getRoom(organizationId, actorId, existing.id);
    }
    return this.createGroup(organizationId, actorId, {
      type: 'CLIENT',
      name,
      clientId,
      memberUserIds: [actorId],
    });
  }

  async updateRoom(
    organizationId: string,
    actorId: string,
    roomId: string,
    input: UpdateRoomDto,
  ): Promise<ChatRoomDto> {
    const { room, membership } = await this.requireMembership(
      organizationId,
      roomId,
      actorId,
    );
    if (!membership.canManage) {
      throw problem(HttpStatus.FORBIDDEN, 'Cannot manage room', ErrorCodes.FORBIDDEN);
    }
    await this.repository.updateRoom(organizationId, roomId, {
      name: input.name,
      description: input.description,
      avatarAssetId: input.avatarAssetId,
      archivedAt:
        input.archived === undefined
          ? undefined
          : input.archived
            ? new Date()
            : null,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'chat/rooms.update',
      entityType: ENTITY_ROOM,
      entityId: roomId,
      before: { name: room.name, archivedAt: room.archivedAt },
      after: { ...input },
    });
    const dto = await this.getRoom(organizationId, actorId, roomId);
    this.realtime.publishToRoom(
      chatRoomChannel(organizationId, roomId),
      RealtimeEvents.CHAT_ROOM_UPDATED,
      dto,
    );
    return dto;
  }

  async addMembers(
    organizationId: string,
    actorId: string,
    roomId: string,
    input: AddMembersDto,
  ): Promise<ChatRoomDto> {
    const { room, membership } = await this.requireMembership(
      organizationId,
      roomId,
      actorId,
    );
    if (room.type === 'DM') {
      throw problem(HttpStatus.BAD_REQUEST, 'Cannot add members to DM', ErrorCodes.VALIDATION_FAILED);
    }
    if (!membership.canAddMembers) {
      throw problem(HttpStatus.FORBIDDEN, 'Cannot add members', ErrorCodes.FORBIDDEN);
    }
    const role = input.role ?? 'MEMBER';
    await this.repository.addMembers(
      organizationId,
      roomId,
      [...new Set(input.userIds)].map((userId) => ({
        userId,
        role,
        ...capabilitiesFor(role),
      })),
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'chat/rooms.add_members',
      entityType: ENTITY_ROOM,
      entityId: roomId,
      after: { userIds: input.userIds, role },
    });
    return this.getRoom(organizationId, actorId, roomId);
  }

  async removeMember(
    organizationId: string,
    actorId: string,
    roomId: string,
    userId: string,
  ): Promise<void> {
    const { membership } = await this.requireMembership(
      organizationId,
      roomId,
      actorId,
    );
    if (userId !== actorId && !membership.canManage) {
      throw problem(
        HttpStatus.FORBIDDEN,
        'Cannot remove member',
        ErrorCodes.FORBIDDEN,
      );
    }
    await this.repository.leaveMember(organizationId, roomId, userId);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'chat/rooms.remove_member',
      entityType: ENTITY_ROOM,
      entityId: roomId,
      after: { userId },
    });
  }

  async updateMembership(
    organizationId: string,
    actorId: string,
    roomId: string,
    targetUserId: string,
    input: UpdateMembershipDto,
  ): Promise<ChatMemberDto> {
    const { membership } = await this.requireMembership(
      organizationId,
      roomId,
      actorId,
    );
    const managingOthers = targetUserId !== actorId;
    if (
      managingOthers &&
      !membership.canManage &&
      (input.role ||
        input.canPost !== undefined ||
        input.canAddMembers !== undefined ||
        input.canManage !== undefined)
    ) {
      throw problem(HttpStatus.FORBIDDEN, 'Cannot manage member', ErrorCodes.FORBIDDEN);
    }

    await this.repository.updateMembership(organizationId, roomId, targetUserId, {
      notificationLevel: input.notificationLevel,
      mutedUntil:
        input.mutedUntil === undefined
          ? undefined
          : input.mutedUntil
            ? new Date(input.mutedUntil)
            : null,
      pinnedAt:
        input.pinned === undefined
          ? undefined
          : input.pinned
            ? new Date()
            : null,
      role: input.role,
      canPost: input.canPost,
      canAddMembers: input.canAddMembers,
      canManage: input.canManage,
    });

    const updated = await this.repository.findMembership(
      organizationId,
      roomId,
      targetUserId,
    );
    if (!updated) throw notFound();
    return toMemberDto(updated);
  }

  async listMessages(
    organizationId: string,
    userId: string,
    roomId: string,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPage<ChatMessageDto>> {
    await this.requireMembership(organizationId, roomId, userId);
    const pageSize = limit ?? this.messageLimitDefault();
    const rows = await this.repository.listMessages(
      organizationId,
      roomId,
      pageSize + 1,
      cursor,
    );
    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    const items = page.map((row) => toMessageDto(row, userId)).reverse();
    return {
      items,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async sendMessage(
    organizationId: string,
    actorId: string,
    roomId: string,
    input: SendMessageDto,
  ): Promise<ChatMessageDto> {
    const { membership } = await this.requireMembership(
      organizationId,
      roomId,
      actorId,
    );
    if (!membership.canPost) {
      throw problem(HttpStatus.FORBIDDEN, 'Cannot post', ErrorCodes.FORBIDDEN);
    }
    if (!input.body.trim() && !(input.attachments?.length ?? 0)) {
      throw problem(
        HttpStatus.BAD_REQUEST,
        'Message body or attachment required',
        ErrorCodes.VALIDATION_FAILED,
      );
    }

    if (input.clientMessageId) {
      const existing = await this.repository.findByClientMessageId(
        organizationId,
        roomId,
        input.clientMessageId,
      );
      if (existing) return toMessageDto(existing, actorId);
    }

    const hasAttachments = Boolean(input.attachments?.length);
    const message = await this.repository.createMessage(
      organizationId,
      roomId,
      {
        senderId: actorId,
        clientMessageId: input.clientMessageId,
        type: input.type ?? (hasAttachments && !input.body.trim() ? 'MEDIA' : 'TEXT'),
        body: input.body,
        replyToId: input.replyToId,
        linkPreview: input.linkPreview
          ? (input.linkPreview as unknown as Prisma.InputJsonValue)
          : undefined,
        attachments: input.attachments?.map((a, index) => ({
          ...a,
          sortOrder: a.sortOrder ?? index,
        })),
        mentions: input.mentions,
      },
      previewOf(input.body, hasAttachments),
    );

    const dto = toMessageDto(message, actorId);

    this.realtime.publishToRoom(
      chatRoomChannel(organizationId, roomId),
      RealtimeEvents.CHAT_MESSAGE_CREATED,
      dto,
    );

    const members = await this.repository.listActiveMemberUserIds(
      organizationId,
      roomId,
    );
    const recipientIds = members
      .filter((m) => m.userId !== actorId)
      .map((m) => m.userId);
    const mentionedUserIds = (input.mentions ?? [])
      .filter((m) => m.type === 'USER')
      .map((m) => m.targetId)
      .filter((id) => id !== actorId);

    await this.outbox.write({
      type: DomainEventTypes.CHAT_MESSAGE_CREATED,
      version: 1,
      organizationId,
      payload: {
        roomId,
        messageId: message.id,
        senderId: actorId,
        preview: previewOf(input.body, hasAttachments),
        recipientIds,
        mentionedUserIds,
      },
      actor: { id: actorId, type: 'user' },
    });

    if (mentionedUserIds.length) {
      await this.outbox.write({
        type: DomainEventTypes.CHAT_MEMBER_MENTIONED,
        version: 1,
        organizationId,
        payload: {
          roomId,
          messageId: message.id,
          senderId: actorId,
          recipientIds: mentionedUserIds,
          title: previewOf(input.body, hasAttachments),
        },
        actor: { id: actorId, type: 'user' },
      });
    }

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'chat/messages.create',
      entityType: ENTITY_MESSAGE,
      entityId: message.id,
      after: { roomId, type: message.type },
    });

    return dto;
  }

  async editMessage(
    organizationId: string,
    actorId: string,
    roomId: string,
    messageId: string,
    input: EditMessageDto,
  ): Promise<ChatMessageDto> {
    await this.requireMembership(organizationId, roomId, actorId);
    const existing = await this.repository.findMessage(
      organizationId,
      roomId,
      messageId,
    );
    if (!existing || existing.deletedAt) throw notFound();
    if (existing.senderId !== actorId) {
      throw problem(HttpStatus.FORBIDDEN, 'Cannot edit message', ErrorCodes.FORBIDDEN);
    }
    await this.repository.updateMessageBody(
      organizationId,
      roomId,
      messageId,
      input.body,
    );
    const updated = await this.repository.findMessage(
      organizationId,
      roomId,
      messageId,
    );
    if (!updated) throw notFound();
    const dto = toMessageDto(updated, actorId);
    this.realtime.publishToRoom(
      chatRoomChannel(organizationId, roomId),
      RealtimeEvents.CHAT_MESSAGE_UPDATED,
      dto,
    );
    await this.outbox.write({
      type: DomainEventTypes.CHAT_MESSAGE_UPDATED,
      version: 1,
      organizationId,
      payload: { roomId, messageId },
      actor: { id: actorId, type: 'user' },
    });
    return dto;
  }

  async deleteMessage(
    organizationId: string,
    actorId: string,
    roomId: string,
    messageId: string,
  ): Promise<void> {
    const { membership } = await this.requireMembership(
      organizationId,
      roomId,
      actorId,
    );
    const existing = await this.repository.findMessage(
      organizationId,
      roomId,
      messageId,
    );
    if (!existing || existing.deletedAt) throw notFound();
    if (existing.senderId !== actorId && !membership.canManage) {
      throw problem(
        HttpStatus.FORBIDDEN,
        'Cannot delete message',
        ErrorCodes.FORBIDDEN,
      );
    }
    await this.repository.softDeleteMessage(organizationId, roomId, messageId);
    this.realtime.publishToRoom(
      chatRoomChannel(organizationId, roomId),
      RealtimeEvents.CHAT_MESSAGE_DELETED,
      { roomId, messageId },
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'chat/messages.delete',
      entityType: ENTITY_MESSAGE,
      entityId: messageId,
      after: { roomId },
    });
  }

  async markRead(
    organizationId: string,
    actorId: string,
    roomId: string,
    input: MarkReadDto,
  ): Promise<void> {
    await this.requireMembership(organizationId, roomId, actorId);
    await this.repository.updateMembership(organizationId, roomId, actorId, {
      lastReadMessageId: input.messageId,
      lastReadAt: new Date(),
    });
    this.realtime.publishToRoom(
      chatRoomChannel(organizationId, roomId),
      RealtimeEvents.CHAT_READ,
      { roomId, userId: actorId, messageId: input.messageId },
    );
  }

  async typing(
    organizationId: string,
    actorId: string,
    roomId: string,
    input: TypingDto,
  ): Promise<void> {
    await this.requireMembership(organizationId, roomId, actorId);
    this.realtime.publishToRoom(
      chatRoomChannel(organizationId, roomId),
      RealtimeEvents.CHAT_TYPING,
      { roomId, userId: actorId, typing: input.typing },
    );
  }
}
