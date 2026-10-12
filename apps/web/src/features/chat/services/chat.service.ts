import 'server-only';
import type { ChatMessageDto, ChatRoomDto, CursorPage } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import {
  chatUnreadCount,
  createChatDm,
  createChatGroup,
  getChatRoom,
  getOrCreateClientChatRoom,
  listChatMessages,
  listChatRooms,
  markChatRead,
  postWhizRoomReply,
  sendChatMessage,
} from '@/shared/api/live/chat';
import {
  chatMessagesRepository,
  chatRoomsRepository,
  demoListMessages,
  toMessageDto,
  toRoomDto,
} from '../data/chat.repository';

export async function listRooms(): Promise<ChatRoomDto[]> {
  if (isLiveMode) return listChatRooms();
  const rooms = await chatRoomsRepository.list();
  return rooms
    .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
    .map(toRoomDto);
}

export async function unreadChatCount(): Promise<number> {
  if (isLiveMode) return chatUnreadCount();
  return (await chatRoomsRepository.list()).reduce((sum, r) => sum + r.unreadCount, 0);
}

export async function getRoom(roomId: string): Promise<ChatRoomDto | null> {
  if (isLiveMode) {
    try {
      return await getChatRoom(roomId);
    } catch {
      return null;
    }
  }
  const room = await chatRoomsRepository.get(roomId);
  return room ? toRoomDto(room) : null;
}

export async function listMessages(roomId: string, cursor?: string): Promise<CursorPage<ChatMessageDto>> {
  if (isLiveMode) return listChatMessages(roomId, cursor);
  return demoListMessages(roomId);
}

export async function sendMessage(
  roomId: string,
  body: string,
  mentions: Array<{
    type: string;
    targetId: string;
    displayText: string;
    startOffset?: number;
    endOffset?: number;
  }> = [],
  replyToId?: string,
  attachments: Array<{
    kind: string;
    assetId?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
  }> = [],
  whizClientStream?: boolean,
): Promise<ChatMessageDto> {
  if (isLiveMode) {
    return sendChatMessage(roomId, body, mentions, attachments, replyToId, whizClientStream);
  }
  const message = await chatMessagesRepository.create({
    roomId,
    senderId: 'm-aarav',
    body,
    replyToId: replyToId ?? null,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  });
  await chatRoomsRepository.update(roomId, {
    lastMessageAt: message.createdAt,
    lastMessagePreview: body.slice(0, 280),
    unreadCount: 0,
  });
  const dto = toMessageDto(message);
  if (!mentions.length) return dto;
  return {
    ...dto,
    mentions: mentions.map((m, index) => ({
      id: `mention-${message.id}-${index}`,
      type: m.type as ChatMessageDto['mentions'][number]['type'],
      targetId: m.targetId,
      displayText: m.displayText,
      startOffset: m.startOffset ?? null,
      endOffset: m.endOffset ?? null,
    })),
  };
}

export async function openDm(userId: string): Promise<ChatRoomDto> {
  if (isLiveMode) return createChatDm(userId);
  const existing = (await chatRoomsRepository.list()).find(
    (r) => r.type === 'DM' && r.memberUserIds.includes(userId),
  );
  if (existing) return toRoomDto(existing);
  const created = await chatRoomsRepository.create({
    type: 'DM',
    name: null,
    description: null,
    clientId: null,
    lastMessageAt: null,
    lastMessagePreview: null,
    memberCount: 2,
    unreadCount: 0,
    viewerCanPost: true,
    memberUserIds: ['m-aarav', userId],
  });
  return toRoomDto(created);
}

export async function openGroup(name: string, memberUserIds: string[]): Promise<ChatRoomDto> {
  if (isLiveMode) {
    return createChatGroup({ type: 'GROUP', name, memberUserIds });
  }
  const created = await chatRoomsRepository.create({
    type: 'GROUP',
    name,
    description: null,
    clientId: null,
    lastMessageAt: null,
    lastMessagePreview: null,
    memberCount: memberUserIds.length + 1,
    unreadCount: 0,
    viewerCanPost: true,
    memberUserIds: ['m-aarav', ...memberUserIds],
  });
  return toRoomDto(created);
}

export async function openClientRoom(clientId: string, name: string): Promise<ChatRoomDto> {
  if (isLiveMode) return getOrCreateClientChatRoom(clientId);
  const existing = (await chatRoomsRepository.list()).find(
    (r) => r.type === 'CLIENT' && r.clientId === clientId,
  );
  if (existing) return toRoomDto(existing);
  const created = await chatRoomsRepository.create({
    type: 'CLIENT',
    name,
    description: null,
    clientId,
    lastMessageAt: null,
    lastMessagePreview: null,
    memberCount: 1,
    unreadCount: 0,
    viewerCanPost: true,
    memberUserIds: ['m-aarav'],
  });
  return toRoomDto(created);
}

export async function postWhizReply(
  roomId: string,
  triggerMessageId: string,
  body: string,
): Promise<ChatMessageDto> {
  if (isLiveMode) return postWhizRoomReply(roomId, triggerMessageId, body);
  const message = await chatMessagesRepository.create({
    roomId,
    senderId: null,
    body,
    replyToId: triggerMessageId,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  });
  await chatRoomsRepository.update(roomId, {
    lastMessageAt: message.createdAt,
    lastMessagePreview: body.slice(0, 280),
  });
  return { ...toMessageDto(message), type: 'SYSTEM', senderId: null };
}

export async function markRead(roomId: string, messageId: string): Promise<void> {
  if (isLiveMode) {
    await markChatRead(roomId, messageId);
    return;
  }
  await chatRoomsRepository.update(roomId, { unreadCount: 0 });
}
