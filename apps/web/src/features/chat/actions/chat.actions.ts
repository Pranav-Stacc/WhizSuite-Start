'use server';

import { Permissions } from '@agency-os/contracts';
import { revalidatePath } from 'next/cache';
import { authorize } from '@/shared/auth/permissions';
import { openClientRoom, openDm, openGroup, sendMessage } from '../services/chat.service';

export async function sendChatMessageAction(roomId: string, body: string) {
  await authorize(Permissions.CHAT_SEND);
  const trimmed = body.trim();
  if (!trimmed) return { ok: false as const, error: 'empty' };
  const message = await sendMessage(roomId, trimmed);
  revalidatePath('/chat');
  return { ok: true as const, message };
}

export async function createDmAction(userId: string) {
  await authorize(Permissions.CHAT_CREATE_ROOM);
  const room = await openDm(userId);
  revalidatePath('/chat');
  return { ok: true as const, roomId: room.id };
}

export async function createGroupAction(name: string, memberUserIds: string[]) {
  await authorize(Permissions.CHAT_CREATE_ROOM);
  const room = await openGroup(name.trim(), memberUserIds);
  revalidatePath('/chat');
  return { ok: true as const, roomId: room.id };
}

export async function openClientChatAction(clientId: string, name: string) {
  await authorize(Permissions.CHAT_VIEW);
  const room = await openClientRoom(clientId, name);
  revalidatePath('/chat');
  return { ok: true as const, roomId: room.id };
}
