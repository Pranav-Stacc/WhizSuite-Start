import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';
import { Permissions } from '@agency-os/contracts';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { PageHeader } from '@/shared/ui/page-header';
import { ChatRoomThread } from '@/features/chat/components/chat-room-thread';
import { listMessages, openClientRoom } from '@/features/chat/services/chat.service';
import { getClient } from '@/features/clients/services/clients.service';
import { listMembers, membersById } from '@/features/team/services/members.service';
import { Card, CardBody } from '@/shared/ui/card';

export const metadata: Metadata = { title: t('portal.messages.title') };

export default async function PortalMessagesPage() {
  const session = await requirePermission(Permissions.CHAT_VIEW);
  const clientId = session.clientId;
  if (!clientId) {
    return (
      <PageHeader title={t('portal.messages.title')} description={t('portal.messages.description')} />
    );
  }

  const client = await getClient(clientId);
  const room = await openClientRoom(clientId, client?.name ?? 'Client chat');
  const [page, members, allMembers] = await Promise.all([
    listMessages(room.id),
    membersById(),
    listMembers(),
  ]);
  const names: Record<string, string> = {};
  for (const [id, member] of members) names[id] = member.name;
  const mentionCandidates = allMembers
    .filter((m) => m.id !== session.userId)
    .map((m) => ({ id: m.id, label: m.name.split(' ')[0] || m.name, type: 'USER' as const }));

  return (
    <div>
      <PageHeader
        title={t('portal.messages.title')}
        description={t('portal.messages.description')}
        eyebrow={<MessageSquare className="inline size-3.5" />}
      />

      <Card>
        <CardBody className="flex max-h-[36rem] min-h-[28rem] flex-col overflow-hidden p-0">
          <ChatRoomThread
            roomId={room.id}
            messages={page.items}
            viewerId={session.userId}
            membersById={names}
            mentionCandidates={mentionCandidates}
            canPost={room.viewerCanPost}
          />
        </CardBody>
      </Card>
    </div>
  );
}
