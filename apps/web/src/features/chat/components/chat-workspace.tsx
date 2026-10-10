import Link from 'next/link';
import type { ReactNode } from 'react';
import type {
  AgentDefinitionDto,
  AgentPendingActionDto,
  AgentRunDto,
  AgentScheduleDto,
  AgentSessionDto,
  ChatMessageDto,
  ChatRoomDto,
} from '@agency-os/contracts';
import { Building2, MessageSquare, Sparkles, Users } from 'lucide-react';
import { AgentWorkspace } from '@/features/agent/components/agent-workspace';
import { t } from '@/shared/i18n/t';
import { relativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/feedback';
import { ChatRoomThread } from './chat-room-thread';
import type { MentionCandidate } from './send-message-form';

function roomTitle(room: ChatRoomDto, titles: Map<string, string>): string {
  return titles.get(room.id) ?? room.name ?? (room.type === 'DM' ? t('chat.dm') : t('chat.untitled'));
}

function RoomTypeIcon({ type }: { type: ChatRoomDto['type'] }) {
  if (type === 'CLIENT') return <Building2 className="size-3.5" />;
  if (type === 'GROUP') return <Users className="size-3.5" />;
  return <MessageSquare className="size-3.5" />;
}

export type WhizAgentProps = {
  sessions: AgentSessionDto[];
  selectedSession: AgentSessionDto | null;
  messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
  runs: AgentRunDto[];
  pendingActions: AgentPendingActionDto[];
  definitions: AgentDefinitionDto[];
  schedules: AgentScheduleDto[];
  sessionId?: string;
  canManageAgents: boolean;
};

export function ChatWorkspace({
  rooms,
  selected,
  messages,
  membersById,
  roomTitles,
  viewerId,
  mentionCandidates,
  headerActions,
  compact = false,
  whizActive = false,
  showWhiz = false,
  whiz,
}: {
  rooms: ChatRoomDto[];
  selected: ChatRoomDto | null;
  messages: ChatMessageDto[];
  membersById: Map<string, string>;
  roomTitles?: Map<string, string>;
  viewerId: string;
  mentionCandidates?: MentionCandidate[];
  headerActions?: ReactNode;
  compact?: boolean;
  /** When true, the main pane shows Whiz AI (agent) instead of a room. */
  whizActive?: boolean;
  /** Pin Whiz in the conversation list (requires AI_CHAT). */
  showWhiz?: boolean;
  whiz?: WhizAgentProps | null;
}) {
  const titles = roomTitles ?? new Map<string, string>();

  return (
    <div
      className={cn(
        'grid overflow-hidden rounded-2xl border border-border-soft bg-surface',
        compact ? 'min-h-[28rem]' : 'min-h-[min(70vh,36rem)] sm:min-h-[70vh]',
        'lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]',
      )}
    >
      <aside className="border-b border-border-soft lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-border-soft px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-sm font-semibold">{t('chat.rooms')}</h2>
            <Badge tone="neutral">{rooms.length + (showWhiz ? 1 : 0)}</Badge>
          </div>
          {headerActions}
        </div>
        <ul
          className={cn(
            'overflow-y-auto',
            compact ? 'max-h-64' : 'max-h-[36vh] sm:max-h-[40vh] lg:max-h-[calc(70vh-3.25rem)]',
          )}
        >
          {showWhiz ? (
            <li>
              <Link
                href={
                  whiz?.sessionId
                    ? `/chat?whiz=1&session=${whiz.sessionId}`
                    : '/chat?whiz=1'
                }
                className={cn(
                  'block border-b border-border-soft px-4 py-3 transition hover:bg-muted/60',
                  whizActive && 'bg-muted',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="mb-0.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-sky-600 dark:text-sky-300">
                      <Sparkles className="size-3.5" />
                      {t('chat.type.whiz')}
                    </div>
                    <p className={cn('truncate text-sm', whizActive ? 'font-semibold' : 'font-medium')}>
                      {t('chat.whiz')}
                    </p>
                    <p className="truncate text-xs text-muted">{t('chat.whiz.preview')}</p>
                  </div>
                </div>
              </Link>
            </li>
          ) : null}

          {rooms.map((room) => {
            const active = !whizActive && selected?.id === room.id;
            const unread = room.unreadCount > 0;
            return (
              <li key={room.id}>
                <Link
                  href={`/chat?room=${room.id}`}
                  className={cn('block px-4 py-3 transition hover:bg-muted/60', active && 'bg-muted')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-0.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
                        <RoomTypeIcon type={room.type} />
                        {room.type === 'CLIENT'
                          ? t('chat.type.client')
                          : room.type === 'GROUP'
                            ? t('chat.type.group')
                            : t('chat.type.dm')}
                      </div>
                      <p className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>
                        {roomTitle(room, titles)}
                      </p>
                      <p className={cn('truncate text-xs', unread ? 'text-foreground' : 'text-muted')}>
                        {room.lastMessagePreview ?? '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {room.lastMessageAt ? (
                        <span className="text-[10px] text-muted">{relativeTime(room.lastMessageAt)}</span>
                      ) : null}
                      {unread ? <Badge tone="info">{room.unreadCount}</Badge> : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        {rooms.length === 0 && !showWhiz ? (
          <div className="p-6">
            <EmptyState
              icon={<MessageSquare />}
              title={t('chat.empty.rooms.title')}
              body={t('chat.empty.rooms.body')}
            />
          </div>
        ) : null}
      </aside>

      <section className="flex min-h-[50vh] flex-col">
        {whizActive && whiz ? (
          <AgentWorkspace
            embedded
            sessions={whiz.sessions}
            selectedSession={whiz.selectedSession}
            messages={whiz.messages}
            runs={whiz.runs}
            pendingActions={whiz.pendingActions}
            definitions={whiz.definitions}
            schedules={whiz.schedules}
            sessionId={whiz.sessionId}
            canManageAgents={whiz.canManageAgents}
            sessionHref={(id) => `/chat?whiz=1&session=${id}`}
          />
        ) : selected ? (
          <>
            <header className="flex items-center gap-3 border-b border-border-soft px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <RoomTypeIcon type={selected.type} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{roomTitle(selected, titles)}</h3>
                <p className="text-xs text-muted">
                  {selected.memberCount} {t('chat.members')}
                  {selected.description ? ` · ${selected.description}` : ''}
                </p>
              </div>
            </header>

            <ChatRoomThread
              roomId={selected.id}
              messages={messages}
              viewerId={viewerId}
              membersById={Object.fromEntries(membersById)}
              mentionCandidates={mentionCandidates}
              canPost={selected.viewerCanPost}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              icon={<MessageSquare />}
              title={t('chat.empty.select.title')}
              body={t('chat.empty.select.body')}
            />
          </div>
        )}
      </section>
    </div>
  );
}
