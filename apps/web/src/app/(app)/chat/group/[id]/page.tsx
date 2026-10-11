import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { ChatGroupDetail } from '@/features/chat/components/chat-group-detail';
import { getRoom } from '@/features/chat/services/chat.service';
import { membersById } from '@/features/team/services/members.service';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const room = await getRoom(id);
  return { title: room?.name ?? t('chat.group.detail') };
}

export default async function ChatGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permissions.CHAT_VIEW);
  const { id } = await params;
  const room = await getRoom(id);
  if (!room || room.type !== 'GROUP') notFound();

  const names = await membersById();
  const membersByIdRecord = Object.fromEntries([...names.entries()].map(([id, member]) => [id, member.name]));

  return (
    <ChatGroupDetail
      room={room}
      membersById={membersByIdRecord}
      backHref="/chat"
      threadHref={`/chat?room=${room.id}`}
    />
  );
}
