import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { PageHeader } from '@/shared/ui/page-header';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { membersById } from '@/features/team/services/members.service';
import { ChatWorkspace } from '@/features/chat/components/chat-workspace';
import { getRoom, listMessages, listRooms, markRead } from '@/features/chat/services/chat.service';

export const metadata: Metadata = { title: t('chat.title') };

export default async function ChatPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission(Permissions.CHAT_VIEW);
  const sp = await searchParams;
  const roomId = param(sp, 'room');

  const [rooms, members] = await Promise.all([listRooms(), membersById()]);
  const selected = roomId ? await getRoom(roomId) : (rooms[0] ?? null);
  const page = selected ? await listMessages(selected.id) : { items: [], nextCursor: null, hasMore: false };

  if (selected && page.items.length > 0) {
    const last = page.items[page.items.length - 1];
    if (last) await markRead(selected.id, last.id);
  }

  const names = new Map<string, string>();
  for (const [id, member] of members) {
    names.set(id, member.name);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('chat.title')} description={t('chat.subtitle')} />
      <ChatWorkspace
        rooms={rooms}
        selected={selected}
        messages={page.items}
        membersById={names}
      />
    </div>
  );
}
