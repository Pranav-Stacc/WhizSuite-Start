'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatMessageDto } from '@agency-os/contracts';
import { Reply, X } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { sendChatMessageAction, type ChatMentionPayload } from '../actions/chat.actions';

export interface MentionCandidate {
  id: string;
  label: string;
  type?: ChatMentionPayload['type'];
}

function extractMentions(body: string, candidates: MentionCandidate[]): ChatMentionPayload[] {
  const mentions: ChatMentionPayload[] = [];
  for (const candidate of candidates) {
    const token = `@${candidate.label}`;
    let from = 0;
    while (from < body.length) {
      const index = body.indexOf(token, from);
      if (index === -1) break;
      const end = index + token.length;
      const beforeOk = index === 0 || /\s|[([{"'`]/.test(body[index - 1] ?? '');
      const afterOk = end === body.length || /\s|[)\]},.!?;:'"]/.test(body[end] ?? '');
      if (beforeOk && afterOk) {
        mentions.push({
          type: candidate.type ?? 'USER',
          targetId: candidate.id,
          displayText: candidate.label,
          startOffset: index,
          endOffset: end,
        });
      }
      from = end;
    }
  }
  return mentions;
}

export function SendMessageForm({
  roomId,
  mentionCandidates = [],
  replyTo = null,
  onClearReply,
  membersById,
}: {
  roomId: string;
  mentionCandidates?: MentionCandidate[];
  replyTo?: ChatMessageDto | null;
  onClearReply?: () => void;
  membersById?: Map<string, string>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return mentionCandidates
      .filter((c) => !q || c.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionCandidates, mentionQuery]);

  const replyAuthor = replyTo?.senderId
    ? (membersById?.get(replyTo.senderId) ?? t('chat.unknown'))
    : t('chat.unknown');

  function onChange(value: string) {
    setBody(value);
    const caret = inputRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const match = before.match(/(?:^|\s)@([\w.-]*)$/);
    setMentionQuery(match ? (match[1] ?? '') : null);
  }

  function insertMention(candidate: MentionCandidate) {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? body.length;
    const before = body.slice(0, caret);
    const after = body.slice(caret);
    const replaced = before.replace(/(?:^|\s)@([\w.-]*)$/, (full) => {
      const prefix = full.startsWith('@') ? '' : full[0] ?? '';
      return `${prefix}@${candidate.label} `;
    });
    const next = `${replaced}${after}`;
    setBody(next);
    setMentionQuery(null);
    queueMicrotask(() => {
      el?.focus();
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  return (
    <form
      className="relative space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = body.trim();
        if (!value) return;
        const mentions = extractMentions(body, mentionCandidates);
        const replyId = replyTo?.id;
        startTransition(async () => {
          const result = await sendChatMessageAction(roomId, value, mentions, replyId);
          if (result.ok) {
            setBody('');
            setMentionQuery(null);
            onClearReply?.();
            router.refresh();
          }
        });
      }}
    >
      {replyTo ? (
        <div className="flex items-start gap-2 rounded-xl border border-border-soft bg-muted/50 px-3 py-2">
          <Reply className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary">
              {t('chat.reply.to', { name: replyAuthor })}
            </p>
            <p className="line-clamp-2 text-xs text-muted">
              {replyTo.deletedAt ? t('chat.deleted') : replyTo.body}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
            aria-label={t('chat.reply.cancel')}
            onClick={onClearReply}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <ul
          className="absolute bottom-full left-0 z-10 mb-2 max-h-48 w-full overflow-auto rounded-xl border border-border-soft bg-surface p-1 shadow-lg"
          role="listbox"
          aria-label={t('chat.composer.mentionHint')}
        >
          {suggestions.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => insertMention(candidate)}
              >
                <span>@{candidate.label}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted">
                  {(candidate.type ?? 'USER').toLowerCase()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`chat-composer-${roomId}`}>
          {t('chat.composer.label')}
        </label>
        <textarea
          ref={inputRef}
          id={`chat-composer-${roomId}`}
          value={body}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={t('chat.composer.placeholder')}
          rows={2}
          className="min-h-11 flex-1 resize-none rounded-xl border border-border-soft bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={pending}
          autoComplete="off"
        />
        <Button type="submit" disabled={pending || !body.trim()} className="self-end">
          {t('chat.composer.send')}
        </Button>
      </div>
    </form>
  );
}
