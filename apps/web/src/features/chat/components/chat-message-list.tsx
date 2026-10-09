'use client';

import { useRef, useState } from 'react';
import type { ChatMessageDto } from '@agency-os/contracts';
import { ExternalLink, FileIcon, MessageSquare, Reply } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/feedback';

const REPLY_DRAG_THRESHOLD = 56;

function renderBody(body: string, mentions: ChatMessageDto['mentions']) {
  if (!mentions.length) return body;
  const parts: Array<string | { key: string; text: string }> = [];
  let cursor = 0;
  const ordered = [...mentions]
    .filter((m) => m.startOffset != null && m.endOffset != null)
    .sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));
  for (const mention of ordered) {
    const start = mention.startOffset ?? 0;
    const end = mention.endOffset ?? start;
    if (start < cursor || end > body.length) continue;
    if (start > cursor) parts.push(body.slice(cursor, start));
    parts.push({ key: mention.id, text: body.slice(start, end) || `@${mention.displayText}` });
    cursor = end;
  }
  if (cursor < body.length) parts.push(body.slice(cursor));
  if (!parts.length) return body;
  return parts.map((part, index) =>
    typeof part === 'string' ? (
      <span key={`t-${index}`}>{part}</span>
    ) : (
      <span key={part.key} className="font-medium text-primary">
        {part.text}
      </span>
    ),
  );
}

function MessageBubble({
  message,
  parent,
  own,
  author,
  parentAuthor,
  onReply,
  active,
}: {
  message: ChatMessageDto;
  parent: ChatMessageDto | null;
  own: boolean;
  author: string;
  parentAuthor: string | null;
  onReply?: (message: ChatMessageDto) => void;
  active?: boolean;
}) {
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);

  function endDrag() {
    if (Math.abs(offset) >= REPLY_DRAG_THRESHOLD && onReply && !message.deletedAt) {
      onReply(message);
    }
    startX.current = null;
    setOffset(0);
  }

  return (
    <li className={cn('flex', own ? 'justify-end' : 'justify-start')}>
      <article
        className={cn('relative max-w-[min(85%,36rem)] touch-pan-y', own ? 'items-end' : 'items-start')}
        style={{ transform: `translateX(${offset}px)`, transition: startX.current == null ? 'transform 120ms ease' : undefined }}
        onPointerDown={(event) => {
          if (!onReply || message.deletedAt) return;
          startX.current = event.clientX;
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (startX.current == null) return;
          const delta = event.clientX - startX.current;
          const clamped = own
            ? Math.max(-88, Math.min(0, delta))
            : Math.min(88, Math.max(0, delta));
          setOffset(clamped);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {Math.abs(offset) > 12 ? (
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 text-muted',
              own ? 'right-full mr-2' : 'left-full ml-2',
            )}
            style={{ opacity: Math.min(1, Math.abs(offset) / REPLY_DRAG_THRESHOLD) }}
            aria-hidden
          >
            <Reply className="size-4" />
          </span>
        ) : null}

        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          {!own ? <Avatar name={author} size="xs" /> : null}
          <span className="font-medium text-foreground">{author}</span>
          <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
          {onReply && !message.deletedAt ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted transition hover:bg-muted hover:text-foreground"
              onClick={() => onReply(message)}
            >
              <Reply className="size-3" />
              {t('chat.reply')}
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ring-offset-2',
            own ? 'bg-primary/14' : 'bg-muted',
            active && 'ring-2 ring-primary/40',
          )}
        >
          {parent && !message.deletedAt ? (
            <div className="mb-2 rounded-xl border-l-2 border-primary/50 bg-background/60 px-2.5 py-1.5 text-xs">
              <p className="font-medium text-primary">{parentAuthor ?? t('chat.unknown')}</p>
              <p className="line-clamp-2 text-muted">
                {parent.deletedAt ? t('chat.deleted') : parent.body}
              </p>
            </div>
          ) : null}

          {message.deletedAt ? (
            <span className="italic text-muted">{t('chat.deleted')}</span>
          ) : (
            <p className="whitespace-pre-wrap">{renderBody(message.body, message.mentions)}</p>
          )}

          {!message.deletedAt && message.mentions.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1">
              {message.mentions.map((m) => (
                <li key={m.id}>
                  <Badge tone="neutral">
                    @{m.displayText}
                    <span className="opacity-60"> · {m.type.toLowerCase()}</span>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {!message.deletedAt && message.linkPreview ? (
            <a
              href={message.linkPreview.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block overflow-hidden rounded-xl border border-border-soft bg-background/70 transition hover:border-border"
            >
              {message.linkPreview.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.linkPreview.imageUrl}
                  alt=""
                  className="h-28 w-full object-cover"
                />
              ) : null}
              <div className="space-y-0.5 p-3">
                <p className="truncate text-xs font-medium">
                  {message.linkPreview.title ?? message.linkPreview.url}
                </p>
                {message.linkPreview.description ? (
                  <p className="line-clamp-2 text-[11px] text-muted">
                    {message.linkPreview.description}
                  </p>
                ) : null}
                <p className="inline-flex items-center gap-1 text-[11px] text-muted">
                  <ExternalLink className="size-3" />
                  {t('chat.link.open')}
                </p>
              </div>
            </a>
          ) : null}

          {!message.deletedAt && message.attachments.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {message.attachments.map((file) => (
                <li key={file.id}>
                  {file.kind === 'IMAGE' && file.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.url}
                      alt={file.fileName ?? ''}
                      className="max-h-56 rounded-xl object-cover"
                    />
                  ) : (
                    <a
                      href={file.url ?? '#'}
                      className="inline-flex items-center gap-2 rounded-lg bg-background/70 px-2 py-1.5 text-xs"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileIcon className="size-3.5" />
                      {file.fileName ?? t('chat.attachments', { count: '1' })}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>
    </li>
  );
}

export function ChatMessageList({
  messages,
  viewerId,
  membersById,
  onReply,
  activeReplyId,
}: {
  messages: ChatMessageDto[];
  viewerId: string;
  membersById: Map<string, string>;
  onReply?: (message: ChatMessageDto) => void;
  activeReplyId?: string;
}) {
  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare />}
        title={t('chat.empty.messages.title')}
        body={t('chat.empty.messages.body')}
      />
    );
  }

  const byId = new Map(messages.map((m) => [m.id, m]));

  return (
    <ol className="flex flex-col gap-3">
      {onReply ? (
        <li className="text-center text-[11px] text-muted">{t('chat.reply.hint')}</li>
      ) : null}
      {messages.map((message) => {
        const own = message.senderId === viewerId;
        const author =
          (message.senderId && membersById.get(message.senderId)) || t('chat.unknown');
        const parent = message.replyToId ? (byId.get(message.replyToId) ?? null) : null;
        const parentAuthor = parent?.senderId
          ? (membersById.get(parent.senderId) ?? t('chat.unknown'))
          : null;
        return (
          <MessageBubble
            key={message.id}
            message={message}
            parent={parent}
            own={own}
            author={author}
            parentAuthor={parentAuthor}
            onReply={onReply}
            active={activeReplyId === message.id}
          />
        );
      })}
    </ol>
  );
}
