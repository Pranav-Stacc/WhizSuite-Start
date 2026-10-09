import 'server-only';
import type {
  ChatMessageDto,
  ChatRoomDto,
  CursorPage,
} from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { orgPath } from './utils';

async function orgId(): Promise<string> {
  return (await getSession())?.orgId ?? '';
}

export async function listChatRooms(): Promise<ChatRoomDto[]> {
  const org = await orgId();
  const data = await apiFetch<unknown>(orgPath(org, 'chat/rooms'), {
    tags: [`org:${org}:chat`],
  });
  return Array.isArray(data) ? (data as ChatRoomDto[]) : [];
}

export async function chatUnreadCount(): Promise<number> {
  const org = await orgId();
  const data = await apiFetch<{ count?: number }>(orgPath(org, 'chat/unread-count'), {
    tags: [`org:${org}:chat`],
  });
  return typeof data.count === 'number' ? data.count : 0;
}

export async function getChatRoom(roomId: string): Promise<ChatRoomDto> {
  const org = await orgId();
  return apiFetch<ChatRoomDto>(`${orgPath(org, 'chat/rooms')}/${roomId}`, {
    tags: [`org:${org}:chat`],
  });
}

export async function listChatMessages(
  roomId: string,
  cursor?: string,
): Promise<CursorPage<ChatMessageDto>> {
  const org = await orgId();
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch<CursorPage<ChatMessageDto>>(
    `${orgPath(org, 'chat/rooms')}/${roomId}/messages${qs}`,
    { tags: [`org:${org}:chat`] },
  );
}

export async function sendChatMessage(
  roomId: string,
  body: string,
  mentions?: Array<{
    type: string;
    targetId: string;
    displayText: string;
    startOffset?: number;
    endOffset?: number;
  }>,
): Promise<ChatMessageDto> {
  const org = await orgId();
  return apiFetch<ChatMessageDto>(`${orgPath(org, 'chat/rooms')}/${roomId}/messages`, {
    method: 'POST',
    body: { body, mentions },
  });
}

export async function createChatDm(userId: string): Promise<ChatRoomDto> {
  const org = await orgId();
  return apiFetch<ChatRoomDto>(orgPath(org, 'chat/dms'), {
    method: 'POST',
    body: { userId },
  });
}

export async function createChatGroup(input: {
  type: 'GROUP' | 'CLIENT';
  name: string;
  memberUserIds: string[];
  clientId?: string;
  description?: string;
}): Promise<ChatRoomDto> {
  const org = await orgId();
  return apiFetch<ChatRoomDto>(orgPath(org, 'chat/rooms'), {
    method: 'POST',
    body: input,
  });
}

export async function getOrCreateClientChatRoom(clientId: string): Promise<ChatRoomDto> {
  const org = await orgId();
  return apiFetch<ChatRoomDto>(`${orgPath(org, 'chat/clients')}/${clientId}/room`, {
    tags: [`org:${org}:chat`],
  });
}

export async function markChatRead(roomId: string, messageId: string): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'chat/rooms')}/${roomId}/read`, {
    method: 'POST',
    body: { messageId },
  });
}
