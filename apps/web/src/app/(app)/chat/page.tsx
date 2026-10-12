import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { can, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { PageHeader } from '@/shared/ui/page-header';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { buildChatMentionCandidates } from '@/features/chat/services/chat-mention-candidates.service';
import { membersById } from '@/features/team/services/members.service';
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

  const [rooms, membersMap, mentionCandidates] = await Promise.all([
    listRooms(),
    membersById(),
    buildChatMentionCandidates(session.userId),
  ]);

  let whizSessionId: string | undefined;
  let whizProps = null;
  let whizSessions: Awaited<ReturnType<typeof listAgentSessions>> = [];

  if (canUseWhiz) {
    const orgId = session.orgId!;
    whizSessions = await listAgentSessions(orgId).catch(() => []);
    if (whizSessions.length === 0) {
      try {
        const created = await createAgentSession(orgId);
        whizSessions = [created];
        agentSessionId = created.id;
      } catch {
        whizSessions = [];
      }
    }
    whizSessionId = whizSessions[0]?.id;
  }

  if (canUseWhiz && whizActive) {
    const orgId = session.orgId!;
    const sessions = whizSessions;
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
  } else if (canUseWhiz) {
    whizProps = {
      sessions: [],
      selectedSession: null,
      messages: [],
      runs: [],
      pendingActions: [],
      definitions: [],
      schedules: [],
      sessionId: undefined,
      canManageAgents: false,
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

  const memberOptions = mentionCandidates
    .filter((m) => m.type === 'USER')
    .map((m) => ({ value: m.id, label: m.subtitle ?? m.label }));

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
        membersById={Object.fromEntries(names)}
        roomTitles={Object.fromEntries(roomTitles)}
        viewerId={session.userId}
        mentionCandidates={mentionCandidates}
        showWhiz={canUseWhiz}
        whizActive={whizActive}
        whiz={whizProps}
        whizSessionId={whizSessionId}
        canUseWhiz={canUseWhiz}
      />
    </div>
  );
}
