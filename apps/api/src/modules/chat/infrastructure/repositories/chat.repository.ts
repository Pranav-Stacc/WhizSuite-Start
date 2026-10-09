import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

const MEMBER_SELECT = {
  id: true,
  userId: true,
  role: true,
  canPost: true,
  canAddMembers: true,
  canManage: true,
  notificationLevel: true,
  mutedUntil: true,
  lastReadMessageId: true,
  lastReadAt: true,
  pinnedAt: true,
  joinedAt: true,
  leftAt: true,
} satisfies Prisma.ChatRoomMemberSelect;

const ATTACHMENT_SELECT = {
  id: true,
  assetId: true,
  kind: true,
  sortOrder: true,
  url: true,
  mimeType: true,
  sizeBytes: true,
  fileName: true,
  width: true,
  height: true,
  durationMs: true,
} satisfies Prisma.ChatAttachmentSelect;

const MENTION_SELECT = {
  id: true,
  type: true,
  targetId: true,
  displayText: true,
  startOffset: true,
  endOffset: true,
} satisfies Prisma.ChatMentionSelect;

const REACTION_SELECT = {
  id: true,
  userId: true,
  emoji: true,
} satisfies Prisma.ChatReactionSelect;

const MESSAGE_INCLUDE = {
  attachments: { orderBy: { sortOrder: 'asc' as const }, select: ATTACHMENT_SELECT },
  mentions: { select: MENTION_SELECT },
  reactions: { select: REACTION_SELECT },
} satisfies Prisma.ChatMessageInclude;

const ROOM_SELECT = {
  id: true,
  type: true,
  name: true,
  description: true,
  avatarAssetId: true,
  clientId: true,
  createdById: true,
  lastMessageAt: true,
  lastMessagePreview: true,
  lastMessageId: true,
  memberCount: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  deletedAt: true,
} satisfies Prisma.ChatRoomSelect;

export type ChatMemberRecord = Prisma.ChatRoomMemberGetPayload<{
  select: typeof MEMBER_SELECT;
}>;
export type ChatMessageRecord = Prisma.ChatMessageGetPayload<{
  include: typeof MESSAGE_INCLUDE;
}>;
export type ChatRoomRecord = Prisma.ChatRoomGetPayload<{ select: typeof ROOM_SELECT }>;

export interface MemberSeed {
  userId: string;
  role: string;
  canPost: boolean;
  canAddMembers: boolean;
  canManage: boolean;
}

export interface MessageCreateInput {
  senderId: string;
  clientMessageId?: string;
  type: string;
  body: string;
  replyToId?: string;
  linkPreview?: Prisma.InputJsonValue;
  attachments?: Array<{
    assetId?: string | null;
    kind: string;
    url?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    fileName?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: number | null;
    sortOrder: number;
  }>;
  mentions?: Array<{
    type: string;
    targetId: string;
    displayText: string;
    startOffset?: number | null;
    endOffset?: number | null;
  }>;
}

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  listRoomsForUser(organizationId: string, userId: string, limit: number) {
    return this.prisma.chatRoomMember.findMany({
      where: { organizationId, userId, leftAt: null, room: { deletedAt: null } },
      orderBy: [
        { pinnedAt: { sort: 'desc', nulls: 'last' } },
        { room: { lastMessageAt: { sort: 'desc', nulls: 'last' } } },
      ],
      take: limit,
      include: { room: { select: ROOM_SELECT } },
    });
  }

  findRoom(organizationId: string, roomId: string) {
    return this.prisma.chatRoom.findFirst({
      where: { id: roomId, organizationId, deletedAt: null },
      select: ROOM_SELECT,
    });
  }

  findMembership(organizationId: string, roomId: string, userId: string) {
    return this.prisma.chatRoomMember.findFirst({
      where: { organizationId, roomId, userId, leftAt: null },
      select: MEMBER_SELECT,
    });
  }

  listMembers(organizationId: string, roomId: string) {
    return this.prisma.chatRoomMember.findMany({
      where: { organizationId, roomId, leftAt: null },
      orderBy: { joinedAt: 'asc' },
      select: MEMBER_SELECT,
    });
  }

  listActiveMemberUserIds(organizationId: string, roomId: string) {
    return this.prisma.chatRoomMember.findMany({
      where: { organizationId, roomId, leftAt: null },
      select: { userId: true, notificationLevel: true },
    });
  }

  findDm(organizationId: string, dmKey: string) {
    return this.prisma.chatRoom.findFirst({
      where: { organizationId, dmKey, deletedAt: null },
      select: ROOM_SELECT,
    });
  }

  findClientRoom(organizationId: string, clientId: string) {
    return this.prisma.chatRoom.findFirst({
      where: { organizationId, clientId, type: 'CLIENT', deletedAt: null },
      select: ROOM_SELECT,
    });
  }

  createRoom(
    organizationId: string,
    input: {
      type: string;
      name?: string | null;
      description?: string | null;
      clientId?: string | null;
      dmKey?: string | null;
      createdById: string;
      members: MemberSeed[];
    },
  ) {
    return this.prisma.chatRoom.create({
      data: {
        organizationId,
        type: input.type,
        name: input.name ?? null,
        description: input.description ?? null,
        clientId: input.clientId ?? null,
        dmKey: input.dmKey ?? null,
        createdById: input.createdById,
        memberCount: input.members.length,
        members: {
          create: input.members.map((m) => ({
            organizationId,
            userId: m.userId,
            role: m.role,
            canPost: m.canPost,
            canAddMembers: m.canAddMembers,
            canManage: m.canManage,
          })),
        },
      },
      select: ROOM_SELECT,
    });
  }

  updateRoom(
    organizationId: string,
    roomId: string,
    data: {
      name?: string | null;
      description?: string | null;
      avatarAssetId?: string | null;
      archivedAt?: Date | null;
    },
  ) {
    return this.prisma.chatRoom.updateMany({
      where: { id: roomId, organizationId, deletedAt: null },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  softDeleteRoom(organizationId: string, roomId: string) {
    return this.prisma.chatRoom.updateMany({
      where: { id: roomId, organizationId, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  }

  addMembers(organizationId: string, roomId: string, members: MemberSeed[]) {
    return this.prisma.$transaction(async (tx) => {
      for (const member of members) {
        await tx.chatRoomMember.upsert({
          where: { roomId_userId: { roomId, userId: member.userId } },
          create: {
            organizationId,
            roomId,
            userId: member.userId,
            role: member.role,
            canPost: member.canPost,
            canAddMembers: member.canAddMembers,
            canManage: member.canManage,
          },
          update: {
            leftAt: null,
            role: member.role,
            canPost: member.canPost,
            canAddMembers: member.canAddMembers,
            canManage: member.canManage,
            joinedAt: new Date(),
          },
        });
      }
      const count = await tx.chatRoomMember.count({
        where: { roomId, organizationId, leftAt: null },
      });
      await tx.chatRoom.update({
        where: { id: roomId },
        data: { memberCount: count, version: { increment: 1 } },
      });
    });
  }

  leaveMember(organizationId: string, roomId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.chatRoomMember.updateMany({
        where: { organizationId, roomId, userId, leftAt: null },
        data: { leftAt: new Date() },
      });
      const count = await tx.chatRoomMember.count({
        where: { roomId, organizationId, leftAt: null },
      });
      await tx.chatRoom.update({
        where: { id: roomId },
        data: { memberCount: count, version: { increment: 1 } },
      });
    });
  }

  updateMembership(
    organizationId: string,
    roomId: string,
    userId: string,
    data: {
      notificationLevel?: string;
      mutedUntil?: Date | null;
      pinnedAt?: Date | null;
      lastReadMessageId?: string | null;
      lastReadAt?: Date | null;
      role?: string;
      canPost?: boolean;
      canAddMembers?: boolean;
      canManage?: boolean;
    },
  ) {
    return this.prisma.chatRoomMember.updateMany({
      where: { organizationId, roomId, userId, leftAt: null },
      data,
    });
  }

  async countUnread(
    organizationId: string,
    roomId: string,
    afterMessageId: string | null,
  ): Promise<number> {
    if (!afterMessageId) {
      return this.prisma.chatMessage.count({
        where: { organizationId, roomId, deletedAt: null },
      });
    }
    const cursor = await this.prisma.chatMessage.findFirst({
      where: { id: afterMessageId, organizationId, roomId },
      select: { createdAt: true, id: true },
    });
    if (!cursor) {
      return this.prisma.chatMessage.count({
        where: { organizationId, roomId, deletedAt: null },
      });
    }
    return this.prisma.chatMessage.count({
      where: {
        organizationId,
        roomId,
        deletedAt: null,
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ],
      },
    });
  }

  async listMessages(
    organizationId: string,
    roomId: string,
    limit: number,
    cursorId?: string,
  ): Promise<ChatMessageRecord[]> {
    let cursorFilter: Prisma.ChatMessageWhereInput | undefined;
    if (cursorId) {
      const cursor = await this.prisma.chatMessage.findFirst({
        where: { id: cursorId, organizationId, roomId },
        select: { createdAt: true, id: true },
      });
      if (cursor) {
        cursorFilter = {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        };
      }
    }
    return this.prisma.chatMessage.findMany({
      where: {
        organizationId,
        roomId,
        ...(cursorFilter ?? {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: MESSAGE_INCLUDE,
    });
  }

  findMessage(organizationId: string, roomId: string, messageId: string) {
    return this.prisma.chatMessage.findFirst({
      where: { id: messageId, organizationId, roomId },
      include: MESSAGE_INCLUDE,
    });
  }

  findByClientMessageId(
    organizationId: string,
    roomId: string,
    clientMessageId: string,
  ) {
    return this.prisma.chatMessage.findFirst({
      where: { organizationId, roomId, clientMessageId },
      include: MESSAGE_INCLUDE,
    });
  }

  createMessage(
    organizationId: string,
    roomId: string,
    input: MessageCreateInput,
    preview: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          organizationId,
          roomId,
          senderId: input.senderId,
          clientMessageId: input.clientMessageId,
          type: input.type,
          body: input.body,
          replyToId: input.replyToId,
          linkPreview: input.linkPreview,
          attachments: input.attachments?.length
            ? {
                create: input.attachments.map((a) => ({
                  organizationId,
                  assetId: a.assetId ?? null,
                  kind: a.kind,
                  sortOrder: a.sortOrder,
                  url: a.url ?? null,
                  mimeType: a.mimeType ?? null,
                  sizeBytes:
                    a.sizeBytes === null || a.sizeBytes === undefined
                      ? null
                      : BigInt(a.sizeBytes),
                  fileName: a.fileName ?? null,
                  width: a.width ?? null,
                  height: a.height ?? null,
                  durationMs: a.durationMs ?? null,
                })),
              }
            : undefined,
          mentions: input.mentions?.length
            ? {
                create: input.mentions.map((m) => ({
                  organizationId,
                  type: m.type,
                  targetId: m.targetId,
                  displayText: m.displayText,
                  startOffset: m.startOffset ?? null,
                  endOffset: m.endOffset ?? null,
                })),
              }
            : undefined,
        },
        include: MESSAGE_INCLUDE,
      });

      await tx.chatRoom.update({
        where: { id: roomId },
        data: {
          lastMessageAt: message.createdAt,
          lastMessagePreview: preview,
          lastMessageId: message.id,
          version: { increment: 1 },
        },
      });

      await tx.chatRoomMember.updateMany({
        where: { organizationId, roomId, userId: input.senderId, leftAt: null },
        data: {
          lastReadMessageId: message.id,
          lastReadAt: message.createdAt,
        },
      });

      return message;
    });
  }

  updateMessageBody(
    organizationId: string,
    roomId: string,
    messageId: string,
    body: string,
  ) {
    return this.prisma.chatMessage.updateMany({
      where: { id: messageId, organizationId, roomId, deletedAt: null },
      data: { body, editedAt: new Date() },
    });
  }

  softDeleteMessage(organizationId: string, roomId: string, messageId: string) {
    return this.prisma.chatMessage.updateMany({
      where: { id: messageId, organizationId, roomId, deletedAt: null },
      data: { deletedAt: new Date(), body: '' },
    });
  }

  totalUnreadForUser(organizationId: string, userId: string) {
    return this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM chat.chat_room_members m
      INNER JOIN chat.chat_rooms r ON r.id = m.room_id
      WHERE m.organization_id = ${organizationId}::uuid
        AND m.user_id = ${userId}::uuid
        AND m.left_at IS NULL
        AND r.deleted_at IS NULL
        AND r.last_message_id IS NOT NULL
        AND (
          m.last_read_message_id IS NULL
          OR m.last_read_message_id IS DISTINCT FROM r.last_message_id
        )
        AND EXISTS (
          SELECT 1 FROM chat.chat_messages msg
          WHERE msg.room_id = r.id
            AND msg.deleted_at IS NULL
            AND msg.sender_id IS DISTINCT FROM ${userId}::uuid
            AND (
              m.last_read_message_id IS NULL
              OR msg.created_at > (
                SELECT c.created_at FROM chat.chat_messages c WHERE c.id = m.last_read_message_id
              )
            )
        )
    `;
  }
}
