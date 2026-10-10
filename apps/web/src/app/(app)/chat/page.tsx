import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { requirePermission, can } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { PageHeader } from '@/shared/ui/page-header';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { listMembers, membersById } from '@/features/team/services/members.service';
import { ChatWorkspace } from '@/features/chat/components/chat-workspace';
import { NewChatDialogs } from '@/features/chat/components/new-chat-dialogs';
import { getRoom, listMessages, listRooms, markRead } from '@/features/chat/services/chat.service';
import { chatRoomsRepository } from '@/features/chat/data/chat.repository';
import { isLiveMode } from '@/shared/config/env';
import {
  createAgentSession,
  getAgentSession,
  listAgentDefinitions,
  listAgentPending,
  listAgentRuns,
  listAgentSchedules,
  listAgentSessions,
} from '@/features/agent/services/agent.service';

export const metadata: Metadata = { title: t('chat.title') };

export default async function ChatPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePermission(Permissions.CHAT_VIEW);
  const sp = await searchParams;
  const roomId = param(sp, 'room');
  const whizParam = param(sp, 'whiz');
  const canUseWhiz = await can(Permissions.AI_CHAT);
  const whizActive = canUseWhiz && (whizParam === '1' || whizParam === 'true');
  let agentSessionId = param(sp, 'session');

  const [rooms, membersMap, allMembers] = await Promise.all([
    listRooms(),
    membersById(),
    listMembers(),
  ]);

  let whizProps = null;
  if (canUseWhiz) {
    const orgId = session.orgId!;
    let sessions = await listAgentSessions(orgId).catch(() => []);
    if (sessions.length === 0) {
      try {
        const created = await createAgentSession(orgId);
        sessions = [created];
        agentSessionId = created.id;
      } catch {
        sessions = [];
      }
    }
    if (!agentSessionId) agentSessionId = sessions[0]?.id;

    const canManageAgents = await can(Permissions.AI_AGENTS_MANAGE);
    const [detail, runs, pending, definitions, schedules] = await Promise.all([
      agentSessionId ? getAgentSession(orgId, agentSessionId).catch(() => null) : null,
      listAgentRuns(orgId).catch(() => []),
      listAgentPending(orgId).catch(() => []),
      canManageAgents ? listAgentDefinitions(orgId) : Promise.resolve([]),
      canManageAgents ? listAgentSchedules(orgId) : Promise.resolve([]),
    ]);

    const selectedSession = sessions.find((s) => s.id === agentSessionId) ?? sessions[0] ?? null;
    whizProps = {
      sessions,
      selectedSession,
      messages: detail?.messages ?? [],
      runs,
      pendingActions: pending,
      definitions,
      schedules,
      sessionId: agentSessionId,
      canManageAgents,
    };
  }

  const selected = whizActive ? null : roomId ? await getRoom(roomId) : null;
  const page = selected
    ? await listMessages(selected.id)
    : { items: [], nextCursor: null, hasMore: false };

  if (selected && page.items.length > 0) {
    const last = page.items[page.items.length - 1];
    if (last) await markRead(selected.id, last.id);
  }

  const names = new Map<string, string>();
  for (const [id, member] of membersMap) names.set(id, member.name);

  const roomTitles = new Map<string, string>();
  if (!isLiveMode) {
    const demoRooms = await chatRoomsRepository.list();
    for (const room of demoRooms) {
      if (room.type === 'DM') {
        const peer = room.memberUserIds.find((id) => id !== session.userId);
        if (peer) roomTitles.set(room.id, names.get(peer) ?? t('chat.dm'));
      }
    }
  }
  if (selected?.type === 'DM' && selected.members) {
    const peer = selected.members.find((m) => m.userId !== session.userId);
    if (peer) roomTitles.set(selected.id, names.get(peer.userId) ?? t('chat.dm'));
  }

  const memberOptions = allMembers
    .filter((m) => m.id !== session.userId && m.status !== 'INVITED')
    .map((m) => ({ value: m.id, label: m.name }));

  const mentionCandidates = allMembers
    .filter((m) => m.id !== session.userId)
    .map((m) => ({ id: m.id, label: m.name.split(' ')[0] || m.name, type: 'USER' as const }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('chat.title')}
        description={t('chat.subtitle')}
        actions={<NewChatDialogs memberOptions={memberOptions} />}
      />
      <ChatWorkspace
        rooms={rooms}
        selected={selected}
        messages={page.items}
        membersById={names}
        roomTitles={roomTitles}
        viewerId={session.userId}
        mentionCandidates={mentionCandidates}
        showWhiz={canUseWhiz}
        whizActive={whizActive}
        whiz={whizProps}
      />
    </div>
  );
}
