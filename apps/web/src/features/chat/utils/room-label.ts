import type { ChatRoomDto } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';

function resolveName(
  userId: string,
  names: Map<string, string> | Record<string, string>,
): string | undefined {
  if (names instanceof Map) return names.get(userId);
  return names[userId];
}

/** Human-readable label for a chat room in lists and share pickers. */
export function formatChatRoomLabel(
  room: ChatRoomDto,
  viewerId: string,
  names: Map<string, string> | Record<string, string> = {},
  override?: string,
): string {
  if (override) return override;
  if (room.name?.trim()) return room.name.trim();
  if (room.type === 'DM') {
    const peerId = room.members?.find((member) => member.userId !== viewerId)?.userId;
    if (peerId) return resolveName(peerId, names) ?? t('chat.dm');
    return t('chat.dm');
  }
  if (room.type === 'CLIENT') return t('chat.clientRoom');
  return t('chat.untitled');
}
