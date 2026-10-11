'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { ChatLinkPreviewDto, ChatMessageDto, ChatMentionType } from '@agency-os/contracts';
import { ExternalLink, FileIcon, FileText, MessageSquare, Reply, Sparkles } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/avatar';
import { EmptyState } from '@/shared/ui/feedback';
import { withWhizMention, type MentionCandidate } from './send-message-form';
import { hrefForMention } from '../utils/mention-links';
import { resolveMentionSpans } from '../utils/mention-utils';

const REPLY_DRAG_THRESHOLD = 56;

function linkPreviewHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function shouldShowLinkPreview(preview: ChatLinkPreviewDto | null, isWhiz: boolean): boolean {
  if (!preview?.url) return false;
  const title = preview.title?.trim();
  const description = preview.description?.trim();
  const imageUrl = preview.imageUrl?.trim();
  if (!title && !description && !imageUrl) return false;
  if (isWhiz && imageUrl && !title && !description) return false;
  return true;
}

function ChatLinkPreview({ preview }: { preview: ChatLinkPreviewDto }) {
  const title = preview.title?.trim() || linkPreviewHostname(preview.url);
  const description = preview.description?.trim();
  const imageUrl = preview.imageUrl?.trim();

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex max-w-md gap-3 rounded-xl border border-border-soft/80 bg-surface-2/95 p-2.5 text-foreground shadow-sm transition hover:border-sky-500/35"
    >
      {imageUrl ? (
        <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-border-soft/70 bg-[#0a0a0a]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="size-full object-cover object-left" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1 self-center">
        <p className="truncate text-xs font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{description}</p>
        ) : null}
        <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[10px] text-muted">
          <ExternalLink className="size-3 shrink-0" aria-hidden />
          {linkPreviewHostname(preview.url)}
        </p>
      </div>
    </a>
  );
}

function mentionClass(type: ChatMentionType): string {
  if (type === 'AGENT') {
    return 'rounded-md bg-sky-500/20 px-1 py-0.5 font-semibold text-sky-300 ring-1 ring-sky-500/25';
  }
  if (type === 'USER') {
    return 'rounded-md bg-violet-500/15 px-1 py-0.5 font-medium text-violet-200 underline-offset-2 hover:underline';
  }
  return 'rounded-md bg-amber-500/12 px-1 py-0.5 font-medium text-amber-200/95 underline-offset-2 hover:underline';
}

function renderBody(
  body: string,
  mentions: ChatMessageDto['mentions'],
  candidates: MentionCandidate[],
) {
  const spans = resolveMentionSpans(body, mentions, candidates);
  if (!spans.length) return body;
  const parts: Array<string | { key: string; text: string; type: ChatMentionType; targetId: string }> = [];
  let cursor = 0;
  for (const mention of spans) {
    if (mention.start < cursor || mention.end > body.length) continue;
    if (mention.start > cursor) parts.push(body.slice(cursor, mention.start));
    parts.push({
      key: mention.key,
      text: mention.text,
      type: mention.type,
      targetId: mention.targetId,
    });
    cursor = mention.end;
  }
  if (cursor < body.length) parts.push(body.slice(cursor));
  if (parts.length === 1 && typeof parts[0] === 'string') return body;
  return parts.map((part, index) => {
    if (typeof part === 'string') return <span key={`t-${index}`}>{part}</span>;
    const href = hrefForMention(part.type, part.targetId);
    if (!href) {
      return (
        <span key={part.key} className={mentionClass(part.type)}>
          {part.text}
        </span>
      );
    }
    return (
      <Link key={part.key} href={href} className={mentionClass(part.type)}>
        {part.text}
      </Link>
    );
  });
}

function MessageBubble({
  message,
  parent,
  own,
  author,
  parentAuthor,
  onReply,
  active,
  mentionCandidates,
  isWhiz,
}: {
  message: ChatMessageDto;
  parent: ChatMessageDto | null;
  own: boolean;
  author: string;
  parentAuthor: string | null;
  onReply?: (message: ChatMessageDto) => void;
  active?: boolean;
  mentionCandidates: MentionCandidate[];
  isWhiz?: boolean;
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
          {!own ? (
            message.senderId ? (
              <Link
                href={`/team/${message.senderId}`}
                className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={author}
              >
                <Avatar name={author} size="xs" />
              </Link>
            ) : (
              <Avatar name={author} size="xs" />
            )
          ) : null}
          {isWhiz ? (
            <span className="inline-flex items-center gap-1 font-medium text-sky-300">
              <Sparkles className="size-3" aria-hidden />
              {author}
            </span>
          ) : message.senderId && !own ? (
            <Link
              href={`/team/${message.senderId}`}
              className="font-medium text-foreground hover:underline"
            >
              {author}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{author}</span>
          )}
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
            own
              ? 'border border-sky-500/25 bg-sky-500/12 text-foreground'
              : isWhiz
                ? 'border border-sky-500/35 bg-gradient-to-br from-sky-500/12 to-surface-2/80'
                : 'border border-border-soft/60 bg-surface-2/70 text-foreground',
            active && 'ring-2 ring-sky-500/35',
          )}
        >
          {parent && !message.deletedAt ? (
            <div className="mb-2 rounded-xl border-l-2 border-sky-500/40 bg-surface/50 px-2.5 py-1.5 text-xs">
              <p className="font-medium text-primary">{parentAuthor ?? t('chat.unknown')}</p>
              <p className="line-clamp-2 text-muted">
                {parent.deletedAt ? t('chat.deleted') : parent.body}
              </p>
            </div>
          ) : null}

          {message.deletedAt ? (
            <span className="italic text-muted">{t('chat.deleted')}</span>
          ) : (
            <p className="whitespace-pre-wrap">
              {renderBody(message.body, message.mentions, mentionCandidates)}
            </p>
          )}

          {!message.deletedAt && shouldShowLinkPreview(message.linkPreview, Boolean(isWhiz)) ? (
            <ChatLinkPreview preview={message.linkPreview!} />
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
                      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border-soft/70 bg-surface-2/80 px-3 py-2 text-xs transition hover:border-sky-500/30"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {file.mimeType === 'application/pdf' || file.fileName?.toLowerCase().endsWith('.pdf') ? (
                        <FileText className="size-4 shrink-0 text-red-300" />
                      ) : (
                        <FileIcon className="size-3.5 shrink-0" />
                      )}
                      <span className="truncate">{file.fileName ?? t('chat.attachments', { count: '1' })}</span>
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
  mentionCandidates = [],
}: {
  messages: ChatMessageDto[];
  viewerId: string;
  membersById: Map<string, string>;
  onReply?: (message: ChatMessageDto) => void;
  activeReplyId?: string;
  mentionCandidates?: MentionCandidate[];
}) {
  const candidates = withWhizMention(mentionCandidates);
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
        const isWhiz = message.type === 'SYSTEM' && !message.senderId;
        const own = !isWhiz && message.senderId === viewerId;
        const author = isWhiz
          ? t('chat.whiz')
          : (message.senderId && membersById.get(message.senderId)) || t('chat.unknown');
        const parent = message.replyToId ? (byId.get(message.replyToId) ?? null) : null;
        const parentAuthor = parent
          ? parent.type === 'SYSTEM' && !parent.senderId
            ? t('chat.whiz')
            : parent.senderId
              ? (membersById.get(parent.senderId) ?? t('chat.unknown'))
              : t('chat.unknown')
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
            mentionCandidates={candidates}
            isWhiz={isWhiz}
          />
        );
      })}
    </ol>
  );
}
