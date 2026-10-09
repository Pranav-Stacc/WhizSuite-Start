import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ChatMessageDto, ChatRoomDto } from '@agency-os/contracts';
import { Building2, MessageSquare, Users } from 'lucide-react';
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
            <Badge tone="neutral">{rooms.length}</Badge>
          </div>
          {headerActions}
        </div>
        <ul className={cn('overflow-y-auto', compact ? 'max-h-64' : 'max-h-[36vh] sm:max-h-[40vh] lg:max-h-[calc(70vh-3.25rem)]')}>
          {rooms.map((room) => {
            const active = selected?.id === room.id;
            const unread = room.unreadCount > 0;
            return (
              <li key={room.id}>
                <Link
                  href={`/chat?room=${room.id}`}
                  className={cn(
                    'block px-4 py-3 transition hover:bg-muted/60',
                    active && 'bg-muted',
                  )}
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
        {rooms.length === 0 ? (
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
        {selected ? (
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
