'use server';

import {
  Permissions,
  createChatDmSchema,
  createChatGroupSchema,
  type ChatMentionType,
} from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { parseInput } from '@/shared/data/action-utils';
import { refreshData, refreshPage } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { openClientRoom, openDm, openGroup, sendMessage } from '../services/chat.service';

export interface ChatMentionPayload {
  type: ChatMentionType;
  targetId: string;
  displayText: string;
  startOffset?: number;
  endOffset?: number;
}

export async function sendChatMessageAction(
  roomId: string,
  body: string,
  mentions: ChatMentionPayload[] = [],
  replyToId?: string,
) {
  await authorize(Permissions.CHAT_SEND);
  const trimmed = body.trim();
  if (!trimmed) return { ok: false as const, error: 'empty' };
  const message = await sendMessage(roomId, trimmed, mentions, replyToId);
  await refreshData('chat');
  return { ok: true as const, message };
}

export async function createDmFormAction(
  values: Record<string, unknown>,
): Promise<ActionResult<{ href?: string }>> {
  await authorize(Permissions.CHAT_CREATE_ROOM);
  const parsed = parseInput(createChatDmSchema, values);
  if (!parsed.ok) return parsed.result;
  const room = await openDm(parsed.data.userId);
  await refreshData('chat');
  await refreshPage('/chat');
  return succeed({ href: `/chat?room=${room.id}` }, t('chat.new.created'));
}

export async function createGroupFormAction(
  values: Record<string, unknown>,
): Promise<ActionResult<{ href?: string }>> {
  await authorize(Permissions.CHAT_CREATE_ROOM);
  const parsed = parseInput(createChatGroupSchema, values);
  if (!parsed.ok) return parsed.result;
  const room = await openGroup(parsed.data.name, parsed.data.memberUserIds ?? []);
  await refreshData('chat');
  await refreshPage('/chat');
  return succeed({ href: `/chat?room=${room.id}` }, t('chat.new.created'));
}

export async function openClientChatAction(clientId: string, name: string) {
  await authorize(Permissions.CHAT_VIEW);
  const room = await openClientRoom(clientId, name);
  await refreshData('chat');
  return { ok: true as const, roomId: room.id };
}

export async function sendClientChatMessageAction(
  clientId: string,
  clientName: string,
  raw: unknown,
): Promise<ActionResult> {
  await authorize(Permissions.CHAT_SEND);
  const body =
    typeof raw === 'object' && raw && 'body' in raw && typeof (raw as { body: unknown }).body === 'string'
      ? (raw as { body: string }).body.trim()
      : '';
  if (!body) return fail(t('validation.required'));
  const room = await openClientRoom(clientId, clientName);
  await sendMessage(room.id, body);
  await refreshData('chat');
  await refreshPage('/chat');
  await refreshPage(`/clients/${clientId}/messages`);
  await refreshPage('/portal/messages');
  return succeed(undefined, t('portal.messages.sent'));
}
