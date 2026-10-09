import { Permissions } from '@agency-os/contracts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { SectionHeading } from '@/shared/ui/section-heading';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { ChatRoomThread } from '@/features/chat/components/chat-room-thread';
import { listMessages, openClientRoom } from '@/features/chat/services/chat.service';
import { listMembers, membersById } from '@/features/team/services/members.service';

export const metadata = { title: t('clients.workspace.messages') };

export default async function ClientMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission(Permissions.CHAT_VIEW);
  const client = await getClient((await params).id);
  if (!client) notFound();

  const room = await openClientRoom(client.id, client.name);
  const [page, membersMap, allMembers] = await Promise.all([
    listMessages(room.id),
    membersById(),
    listMembers(),
  ]);
  const names: Record<string, string> = {};
  for (const [id, member] of membersMap) names[id] = member.name;
  const mentionCandidates = allMembers
    .filter((m) => m.id !== session.userId)
    .map((m) => ({ id: m.id, label: m.name.split(' ')[0] || m.name, type: 'USER' as const }));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionHeading
            number={clientSectionNumber('messages')}
            title={t('clients.workspace.messages')}
          />
          <p className="mt-1 text-[13px] text-muted">{t('portal.messages.agencyDescription')}</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/chat?room=${room.id}`}>{t('chat.openFull')}</Link>
        </Button>
      </div>

      <div className="flex max-h-[32rem] min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface">
        <ChatRoomThread
          roomId={room.id}
          messages={page.items}
          viewerId={session.userId}
          membersById={names}
          mentionCandidates={mentionCandidates}
          canPost={room.viewerCanPost}
        />
      </div>
    </section>
  );
}
