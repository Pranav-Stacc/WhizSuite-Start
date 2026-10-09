import Link from 'next/link';
import type { ChatMessageDto, ChatRoomDto } from '@agency-os/contracts';
import { MessageSquare, Users } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/feedback';
import { SendMessageForm } from './send-message-form';

function roomTitle(room: ChatRoomDto): string {
  if (room.name) return room.name;
  if (room.type === 'DM') return t('chat.dm');
  return t('chat.untitled');
}

function roomMeta(room: ChatRoomDto): string {
  if (room.type === 'CLIENT') return t('chat.type.client');
  if (room.type === 'GROUP') return t('chat.type.group');
  return t('chat.type.dm');
}

export function ChatWorkspace({
  rooms,
  selected,
  messages,
  membersById,
}: {
  rooms: ChatRoomDto[];
  selected: ChatRoomDto | null;
  messages: ChatMessageDto[];
  membersById: Map<string, string>;
}) {
  return (
    <div className="grid min-h-[70vh] overflow-hidden rounded-2xl border border-border-soft bg-surface lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-border-soft lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          <h2 className="text-sm font-semibold">{t('chat.rooms')}</h2>
          <Badge tone="neutral">{rooms.length}</Badge>
        </div>
        <ul className="max-h-[40vh] overflow-y-auto lg:max-h-[calc(70vh-3rem)]">
          {rooms.map((room) => {
            const active = selected?.id === room.id;
            return (
              <li key={room.id}>
                <Link
                  href={`/chat?room=${room.id}`}
                  className={`block px-4 py-3 transition hover:bg-muted/60 ${
                    active ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{roomTitle(room)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {room.lastMessagePreview ?? roomMeta(room)}
                      </p>
                    </div>
                    {room.unreadCount > 0 ? (
                      <Badge tone="info">{room.unreadCount}</Badge>
                    ) : null}
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
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{roomTitle(selected)}</h3>
                <p className="text-xs text-muted-foreground">
                  {roomMeta(selected)} · {selected.memberCount} {t('chat.members')}
                </p>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => {
                const author =
                  (message.senderId && membersById.get(message.senderId)) ||
                  t('chat.unknown');
                return (
                  <article key={message.id} className="max-w-[85%]">
                    <div className="mb-1 flex items-baseline gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{author}</span>
                      <time dateTime={message.createdAt}>
                        {new Date(message.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <div className="rounded-2xl bg-muted px-3 py-2 text-sm">
                      {message.deletedAt ? (
                        <span className="italic text-muted-foreground">{t('chat.deleted')}</span>
                      ) : (
                        message.body
                      )}
                      {message.mentions.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-1">
                          {message.mentions.map((m) => (
                            <li key={m.id}>
                              <Badge tone="neutral">
                                @{m.displayText}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {message.attachments.length > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('chat.attachments', { count: String(message.attachments.length) })}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {messages.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare />}
                  title={t('chat.empty.messages.title')}
                  body={t('chat.empty.messages.body')}
                />
              ) : null}
            </div>

            {selected.viewerCanPost ? (
              <div className="border-t border-border-soft p-4">
                <SendMessageForm roomId={selected.id} />
              </div>
            ) : null}
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
