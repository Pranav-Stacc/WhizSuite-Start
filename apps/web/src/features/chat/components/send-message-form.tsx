'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  WHIZ_AGENT_DISPLAY,
  WHIZ_AGENT_TARGET_ID,
  type ChatMentionType,
  type ChatMessageDto,
} from '@agency-os/contracts';
import {
  Building2,
  Calendar,
  FileText,
  FolderKanban,
  LayoutGrid,
  Loader2,
  Paperclip,
  Reply,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { sendChatMessageAction } from '../actions/chat.actions';
import {
  CHAT_ATTACHMENT_ACCEPT,
  type ChatAttachmentReady,
  toChatAttachmentPayload,
  uploadChatAttachment,
} from '../utils/chat-attachment-upload';
import {
  extractMentions,
  groupMentionCandidates,
  mentionQueryAtCaret,
} from '../utils/mention-utils';
import { mentionsWhiz } from '../utils/whiz-mention';

export interface MentionCandidate {
  id: string;
  label: string;
  type?: ChatMentionType;
  href?: string;
  subtitle?: string;
}

export function withWhizMention(candidates: MentionCandidate[]): MentionCandidate[] {
  if (candidates.some((c) => c.type === 'AGENT' || c.id === WHIZ_AGENT_TARGET_ID)) {
    return candidates;
  }
  return [
    { id: WHIZ_AGENT_TARGET_ID, label: WHIZ_AGENT_DISPLAY, type: 'AGENT' },
    ...candidates,
  ];
}

function categoryLabel(type: ChatMentionType): string {
  switch (type) {
    case 'AGENT':
      return t('chat.mention.category.ai');
    case 'USER':
      return t('chat.mention.category.people');
    case 'CLIENT':
      return t('chat.mention.category.clients');
    case 'PROJECT':
      return t('chat.mention.category.projects');
    case 'CONTENT':
      return t('chat.mention.category.content');
    case 'CALENDAR_EVENT':
      return t('chat.mention.category.calendar');
    default:
      return type;
  }
}

function CategoryIcon({ type }: { type: ChatMentionType }) {
  const className = 'size-3.5 shrink-0 text-muted';
  switch (type) {
    case 'AGENT':
      return <Sparkles className={cn(className, 'text-sky-400')} aria-hidden />;
    case 'USER':
      return <User className={className} aria-hidden />;
    case 'CLIENT':
      return <Building2 className={className} aria-hidden />;
    case 'PROJECT':
      return <FolderKanban className={className} aria-hidden />;
    case 'CONTENT':
      return <LayoutGrid className={className} aria-hidden />;
    case 'CALENDAR_EVENT':
      return <Calendar className={className} aria-hidden />;
    default:
      return null;
  }
}

export function SendMessageForm({
  roomId,
  mentionCandidates = [],
  replyTo = null,
  onClearReply,
  membersById,
  onSent,
  canUseWhiz = false,
  whizSessionReady = false,
}: {
  roomId: string;
  mentionCandidates?: MentionCandidate[];
  replyTo?: ChatMessageDto | null;
  onClearReply?: () => void;
  membersById?: Map<string, string>;
  onSent?: (
    message: ChatMessageDto,
    meta?: { whizClientStream?: boolean },
  ) => void;
  canUseWhiz?: boolean;
  whizSessionReady?: boolean;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeFlatIndex, setActiveFlatIndex] = useState(0);
  const [attachments, setAttachments] = useState<ChatAttachmentReady[]>([]);
  const [uploadingAttach, setUploadingAttach] = useState(false);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const candidates = useMemo(
    () => withWhizMention(mentionCandidates),
    [mentionCandidates],
  );

  const grouped = useMemo(() => {
    if (mentionQuery === null) return [];
    return groupMentionCandidates(candidates, mentionQuery, 6);
  }, [candidates, mentionQuery]);

  const flatSuggestions = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped],
  );

  const mentionOpen = mentionQuery !== null;

  useEffect(() => {
    setActiveFlatIndex(0);
  }, [mentionQuery, flatSuggestions.length]);

  const replyAuthor = replyTo?.senderId
    ? (membersById?.get(replyTo.senderId) ?? t('chat.unknown'))
    : t('chat.unknown');

  function syncMentionQuery(value: string, caret?: number) {
    const pos = caret ?? inputRef.current?.selectionStart ?? value.length;
    setMentionQuery(mentionQueryAtCaret(value, pos));
  }

  function onChange(value: string) {
    setBody(value);
    syncMentionQuery(value);
  }

  function insertMention(candidate: MentionCandidate) {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? body.length;
    const before = body.slice(0, caret);
    const after = body.slice(caret);
    const replaced = before.replace(/(?:^|\s)@([^\s@]*)$/, (full) => {
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

  function selectActiveMention() {
    const pick = flatSuggestions[activeFlatIndex];
    if (pick) insertMention(pick);
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length || uploadingAttach) return;
    setUploadingAttach(true);
    try {
      for (const file of [...files]) {
        const ready = await uploadChatAttachment(file);
        setAttachments((current) => [...current, ready]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.failed'));
    } finally {
      setUploadingAttach(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const canSend = Boolean(body.trim()) || attachments.length > 0;

  return (
    <form
      className="relative space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = body.trim();
        if (!value && attachments.length === 0) return;
        const mentions = extractMentions(body, candidates);
        const replyId = replyTo?.id;
        const payload = attachments.map(toChatAttachmentPayload);
        const whizClientStream =
          canUseWhiz && whizSessionReady && mentionsWhiz(value, mentions);
        startTransition(async () => {
          const result = await sendChatMessageAction(
            roomId,
            value,
            mentions,
            replyId,
            payload,
            whizClientStream,
          );
          if (result.ok) {
            setBody('');
            setAttachments([]);
            setMentionQuery(null);
            onClearReply?.();
            onSent?.(result.message, whizClientStream ? { whizClientStream: true } : undefined);
            queueMicrotask(() => inputRef.current?.focus({ preventScroll: true }));
          }
        });
      }}
    >
      {replyTo ? (
        <div className="flex items-start gap-2 rounded-xl border border-border-soft/80 bg-surface-2/40 px-3 py-2">
          <Reply className="mt-0.5 size-3.5 shrink-0 text-sky-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-sky-300">{t('chat.reply.to', { name: replyAuthor })}</p>
            <p className="line-clamp-2 text-xs text-muted">
              {replyTo.deletedAt ? t('chat.deleted') : replyTo.body}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            aria-label={t('chat.reply.cancel')}
            onClick={onClearReply}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {mentionOpen ? (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 w-full max-h-64 overflow-auto rounded-xl border border-border-soft/90 bg-surface-2/95 p-1.5 shadow-xl backdrop-blur-sm"
          role="listbox"
          aria-label={t('chat.composer.mentionHint')}
        >
          {grouped.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">{t('chat.mention.empty')}</p>
          ) : (
            (() => {
              let flat = 0;
              return grouped.map((group) => (
                <div key={group.type} className="mb-1 last:mb-0">
                  <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    <CategoryIcon type={group.type} />
                    {categoryLabel(group.type)}
                  </p>
                  <ul>
                    {group.items.map((candidate) => {
                      const flatIndex = flat;
                      flat += 1;
                      const active = flatIndex === activeFlatIndex;
                      return (
                        <li key={`${group.type}-${candidate.id}`}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition',
                              active ? 'bg-sky-500/15 text-foreground' : 'hover:bg-muted/50',
                            )}
                            onMouseEnter={() => setActiveFlatIndex(flatIndex)}
                            onClick={() => insertMention(candidate)}
                          >
                            <CategoryIcon type={group.type} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">@{candidate.label}</span>
                              {candidate.subtitle && candidate.subtitle !== candidate.label ? (
                                <span className="block truncate text-[11px] text-muted">
                                  {candidate.type === 'AGENT'
                                    ? t('chat.composer.whizHint')
                                    : candidate.subtitle}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ));
            })()
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border-soft/80 bg-surface-2/50 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-within:border-sky-500/30 focus-within:ring-1 focus-within:ring-sky-500/20">
        {attachments.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-2 px-1">
            {attachments.map((att) => (
              <li
                key={att.assetId}
                className="flex items-center gap-2 rounded-xl border border-border-soft/70 bg-surface/60 px-2 py-1.5"
              >
                {att.kind === 'IMAGE' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={att.url} alt="" className="size-10 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
                    <FileText className="size-4" />
                  </span>
                )}
                <span className="max-w-[8rem] truncate text-xs">{att.name}</span>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
                  aria-label={t('chat.attach.remove')}
                  onClick={() =>
                    setAttachments((current) => current.filter((a) => a.assetId !== att.assetId))
                  }
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={CHAT_ATTACHMENT_ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center self-end rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
            disabled={pending || uploadingAttach}
            aria-label={t('chat.attach.add')}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingAttach ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          </button>
        <label className="sr-only" htmlFor={`chat-composer-${roomId}`}>
          {t('chat.composer.label')}
        </label>
        <textarea
          ref={inputRef}
          id={`chat-composer-${roomId}`}
          value={body}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => syncMentionQuery(body, e.currentTarget.selectionStart)}
          onKeyUp={(e) => syncMentionQuery(body, e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (mentionOpen && flatSuggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveFlatIndex((i) => Math.min(i + 1, flatSuggestions.length - 1));
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveFlatIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                e.preventDefault();
                selectActiveMention();
                return;
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setMentionQuery(null);
                return;
              }
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={t('chat.composer.placeholder')}
          rows={2}
          className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted/70"
          disabled={pending || uploadingAttach}
          autoComplete="off"
        />
        <Button
          type="submit"
          disabled={pending || uploadingAttach || !canSend}
          className="self-end shrink-0"
        >
          {t('chat.composer.send')}
        </Button>
        </div>
      </div>
    </form>
  );
}
