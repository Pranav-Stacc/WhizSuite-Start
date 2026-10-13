'use client';

import { useMemo, useState, useTransition } from 'react';
import { Building2, Loader2, MessageCircle, MessageSquare, Search, Users } from 'lucide-react';
import type { ChatRoomType } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import { shareContentInChatAction } from '../actions/content.actions';

export interface ShareChatRoomOption {
  id: string;
  label: string;
  type: ChatRoomType;
}

interface ShareContentDialogProps {
  contentId: string;
  title: string;
  rooms: ShareChatRoomOption[];
  trigger: React.ReactNode;
}

function RoomTypeIcon({ type }: { type: ChatRoomType }) {
  if (type === 'CLIENT') return <Building2 className="size-4 shrink-0 text-muted" />;
  if (type === 'GROUP') return <Users className="size-4 shrink-0 text-muted" />;
  return <MessageSquare className="size-4 shrink-0 text-muted" />;
}

export function ShareContentDialog({ contentId, title, rooms, trigger }: ShareContentDialogProps) {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rooms;
    return rooms.filter((room) => room.label.toLowerCase().includes(needle));
  }, [query, rooms]);

  const share = () => {
    setError(null);
    start(async () => {
      const result = await shareContentInChatAction({ contentId, roomId, title });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.data?.href) {
        window.location.href = result.data.href;
      }
      setOpen(false);
    });
  };

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Modal
        open={open}
        onOpenChange={(next) => !pending && setOpen(next)}
        title={t('content.share.chat.title')}
        description={t('content.share.chat.desc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={share} disabled={pending || !roomId}>
              {pending ? <Loader2 className="animate-spin" /> : <MessageCircle />}
              {t('content.share.chat.send')}
            </Button>
          </>
        }
      >
        <Field label={t('content.share.chat.search')} htmlFor="share-chat-search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="share-chat-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('content.share.chat.searchPlaceholder')}
              className="h-9 pl-9"
              disabled={pending}
            />
          </div>
        </Field>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-border-soft">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">{t('content.share.chat.empty')}</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {filtered.map((room) => {
                const selected = room.id === roomId;
                return (
                  <li key={room.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setRoomId(room.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition',
                        selected ? 'bg-sky-500/10 text-foreground' : 'hover:bg-surface-2',
                      )}
                    >
                      <RoomTypeIcon type={room.type} />
                      <span className="min-w-0 flex-1 truncate font-medium">{room.label}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
                        {room.type === 'DM'
                          ? t('chat.type.dm')
                          : room.type === 'GROUP'
                            ? t('chat.type.group')
                            : t('chat.type.client')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Modal>
    </>
  );
}
