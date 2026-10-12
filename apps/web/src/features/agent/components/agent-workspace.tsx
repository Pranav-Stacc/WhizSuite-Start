'use client';

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AgentDefinitionDto,
  AgentPendingActionDto,
  AgentRunDto,
  AgentScheduleDto,
  AgentSessionDto,
} from '@agency-os/contracts';
import {
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  List,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import {
  confirmPendingAction,
  createSessionAction,
  rejectPendingAction,
} from '../actions/agent.actions';
import { AgentMarkdown } from './agent-markdown';
import { AgentStreamingBubble } from './agent-streaming-bubble';
import { useAgentStream } from '../hooks/use-agent-stream';
import {
  AGENT_ATTACHMENT_ACCEPT,
  appendAttachmentsToMessage,
  type AgentAttachmentReady,
  uploadAgentAttachment,
} from '../utils/agent-attachment-upload';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { Sheet } from '@/shared/ui/overlays';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

const NEAR_BOTTOM_PX = 140;

export function AgentWorkspace({
  sessions,
  selectedSession,
  messages: initialMessages,
  runs,
  pendingActions,
  definitions,
  sessionId,
  embedded = false,
}: {
  sessions: AgentSessionDto[];
  selectedSession: AgentSessionDto | null;
  messages: Message[];
  runs: AgentRunDto[];
  pendingActions: AgentPendingActionDto[];
  definitions: AgentDefinitionDto[];
  schedules: AgentScheduleDto[];
  sessionId?: string;
  canManageAgents: boolean;
  /** When true, styled to sit inside Chat (no outer page chrome). */
  embedded?: boolean;
}) {
  const sessionHref = (id: string) => `/chat?whiz=1&session=${encodeURIComponent(id)}`;
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [agentDefinitionId, setAgentDefinitionId] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [localPending, setLocalPending] = useState(pendingActions);
  const { stream, error, isStreaming, runStream, toggleStep, setError } = useAgentStream();
  const [isPendingAction, startTransition] = useTransition();
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [attachments, setAttachments] = useState<AgentAttachmentReady[]>([]);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setLocalPending(pendingActions);
  }, [pendingActions]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useLayoutEffect(() => {
    stickToBottomRef.current = true;
    scrollToBottom('auto');
  }, [sessionId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_PX;
    if (stickToBottomRef.current || nearBottom) {
      scrollToBottom(stickToBottomRef.current ? 'auto' : 'smooth');
    }
  }, [messages, stream?.text, stream?.status, stream?.steps.length]);

  const suggestions = [
    t('agent.empty.suggestions.createClient'),
    t('agent.empty.suggestions.summarize'),
    t('agent.empty.suggestions.tasks'),
    t('agent.empty.suggestions.tools'),
  ];

  const appendMessage = (role: 'user' | 'assistant', content: string) =>
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${role}-${Date.now()}-${prev.length}`,
        role,
        content,
        createdAt: new Date().toISOString(),
      },
    ]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length || uploadingAttach) return;
    setUploadingAttach(true);
    setError(null);
    try {
      for (const file of [...files]) {
        const ready = await uploadAgentAttachment(file);
        setAttachments((current) => [...current, ready]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('toast.failed'));
    } finally {
      setUploadingAttach(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSend = async (textOverride?: string) => {
    if (!sessionId || isStreaming || uploadingAttach) return;
    const text = (textOverride ?? draft).trim();
    const messageBody = appendAttachmentsToMessage(text, attachments);
    if (!messageBody.trim()) return;

    setDraft('');
    setAttachments([]);
    setError(null);
    stickToBottomRef.current = true;
    appendMessage('user', messageBody);

    const finalText = await runStream(sessionId, messageBody, agentDefinitionId || undefined);
    if (finalText) appendMessage('assistant', finalText);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface',
        embedded
          ? 'flex min-h-0 flex-1 flex-col'
          : 'rounded-2xl border border-border-soft shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.07),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(251,146,60,0.05),_transparent_45%)]"
      />

      <div
        className={cn(
          embedded
            ? 'relative flex min-h-0 flex-1 flex-col'
            : 'relative grid min-h-[min(78vh,46rem)] lg:grid-cols-[240px_minmax(0,1fr)_260px]',
        )}
      >
        <aside
          className={cn(
            'hidden border-b border-border-soft/80 p-3 lg:block lg:border-b-0 lg:border-r',
            embedded && 'lg:hidden',
          )}
        >
          <SessionList
            sessions={sessions}
            sessionId={sessionId}
            sessionHref={sessionHref}
            onCreate={async () => {
              const created = await createSessionAction();
              if (created?.id) router.push(sessionHref(created.id));
            }}
            maxHeightClass={embedded ? 'lg:max-h-[calc(70vh-5.5rem)]' : 'lg:max-h-[calc(78vh-5.5rem)]'}
          />
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft/80 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                aria-label={t('agent.sessions')}
                onClick={() => setSessionsOpen(true)}
              >
                <List className="size-4" />
              </Button>
              <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-amber-500/10 text-sky-300 ring-1 ring-sky-500/20">
                <Sparkles className="size-4" />
                {isStreaming ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-sky-400" />
                ) : null}
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  {selectedSession?.title ?? t('agent.title')}
                </p>
                <p className="text-[11px] text-muted">
                  {isStreaming ? stream.status : t('agent.coverage')}
                </p>
              </div>
            </div>
            {definitions.length > 0 ? (
              <label className="flex w-full flex-col gap-1 text-xs text-muted sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                <span className="shrink-0">{t('agent.pickAgent')}</span>
                <select
                  value={agentDefinitionId}
                  onChange={(e) => setAgentDefinitionId(e.target.value)}
                  className="w-full rounded-lg border border-border-soft bg-surface-2/80 px-2 py-1.5 text-foreground sm:w-auto"
                >
                  <option value="">{t('agent.pickAgent.default')}</option>
                  {definitions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </header>

          <Sheet open={sessionsOpen} onOpenChange={setSessionsOpen} title={t('agent.sessions')} width="max-w-sm" side="left">
            <SessionList
              sessions={sessions}
              sessionId={sessionId}
              sessionHref={sessionHref}
              onCreate={async () => {
                const created = await createSessionAction();
                if (created?.id) {
                  setSessionsOpen(false);
                  router.push(sessionHref(created.id));
                }
              }}
              onSelect={() => setSessionsOpen(false)}
              maxHeightClass="max-h-[70dvh]"
            />
          </Sheet>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5"
            aria-live="polite"
            aria-busy={isStreaming}
            onScroll={() => {
              const el = scrollRef.current;
              if (!el) return;
              const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
              stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;
            }}
          >
            {messages.length === 0 && !stream ? (
              <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-6">
                <EmptyState
                  icon={<Bot />}
                  title={t('agent.empty.title')}
                  body={t('agent.empty.body')}
                />
                <div className="flex max-w-xl flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="rounded-full border border-border-soft/80 bg-surface-2/50 px-3.5 py-1.5 text-left text-xs text-muted transition hover:border-sky-500/40 hover:text-foreground"
                      onClick={() => void onSend(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble key={m.id} role={m.role} content={m.content} />
                ))}
                {stream ? <AgentStreamingBubble stream={stream} onToggleStep={toggleStep} /> : null}
                {error ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                  >
                    {error}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {localPending.length > 0 ? (
            <div className="space-y-2 border-t border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
              {localPending.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-surface/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
                      {t('agent.pending')}
                    </p>
                    <p className="truncate text-sm">{p.summary}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={isPendingAction}
                      onClick={() => {
                        startTransition(async () => {
                          await confirmPendingAction(p.id);
                          setLocalPending((current) => current.filter((item) => item.id !== p.id));
                        });
                      }}
                    >
                      <CheckCircle2 className="size-3.5" />
                      {t('agent.confirm')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={isPendingAction}
                      onClick={() => {
                        startTransition(async () => {
                          await rejectPendingAction(p.id);
                          setLocalPending((current) => current.filter((item) => item.id !== p.id));
                        });
                      }}
                    >
                      <XCircle className="size-3.5" />
                      {t('agent.reject')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <footer className="border-t border-border-soft/80 p-4">
            <form
              className="rounded-2xl border border-border-soft bg-surface-2/40 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-within:border-sky-500/40"
              onSubmit={(e) => {
                e.preventDefault();
                void onSend();
              }}
            >
              {attachments.length > 0 ? (
                <ul className="mb-2 flex flex-wrap gap-2 px-1">
                  {attachments.map((att) => (
                    <li
                      key={att.assetId}
                      className="group relative flex items-center gap-2 rounded-xl border border-border-soft/70 bg-surface/60 px-2 py-1.5"
                    >
                      {att.mimeType.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed upload preview
                        <img
                          src={att.url}
                          alt=""
                          className="size-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
                          <FileText className="size-4" />
                        </span>
                      )}
                      <span className="max-w-[8rem] truncate text-xs text-foreground">{att.name}</span>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted hover:bg-muted/60 hover:text-foreground"
                        aria-label={t('agent.attach.remove')}
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
                  accept={AGENT_ATTACHMENT_ACCEPT}
                  multiple
                  className="sr-only"
                  onChange={(e) => void onPickFiles(e.target.files)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="self-end shrink-0"
                  disabled={isStreaming || uploadingAttach || !sessionId}
                  aria-label={t('agent.attach.add')}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingAttach ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Paperclip className="size-4" />
                  )}
                </Button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('agent.placeholder')}
                  aria-label={t('agent.placeholder')}
                  rows={2}
                  className="min-h-[3rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted/70"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={
                    isStreaming ||
                    uploadingAttach ||
                    (!draft.trim() && attachments.length === 0) ||
                    !sessionId
                  }
                  variant="primary"
                  className="self-end"
                >
                  <Send className="size-4" />
                  {t('agent.send')}
                </Button>
              </div>
            </form>
          </footer>
        </section>

        <aside
          className={cn(
            'hidden border-t border-border-soft/80 p-4 lg:block lg:border-t-0 lg:border-l',
            embedded && 'lg:hidden',
          )}
        >
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <Clock className="size-3.5" />
            {t('agent.runs')}
          </h3>
          <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {runs.slice(0, 12).map((run) => (
              <li
                key={run.id}
                className="rounded-xl border border-border-soft/70 bg-surface-2/30 px-2.5 py-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-foreground/85">{run.prompt}</span>
                  <Badge tone={run.status === 'COMPLETED' ? 'success' : 'neutral'}>
                    {run.status}
                  </Badge>
                </div>
              </li>
            ))}
            {runs.length === 0 ? (
              <li className="text-xs text-muted">{t('agent.runs.empty')}</li>
            ) : null}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={cn('max-w-[90%]', isUser ? 'ml-auto' : 'mr-auto')}>
      <div
        className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'whitespace-pre-wrap rounded-tr-md border border-sky-500/25 bg-sky-500/12 text-foreground'
            : 'rounded-tl-md border border-sky-500/35 bg-gradient-to-br from-sky-500/12 to-surface-2/80 text-foreground',
        )}
      >
        <AgentMarkdown content={content} />
      </div>
    </div>
  );
}

function SessionList({
  sessions,
  sessionId,
  sessionHref,
  onCreate,
  onSelect,
  maxHeightClass,
}: {
  sessions: AgentSessionDto[];
  sessionId?: string;
  sessionHref: (id: string) => string;
  onCreate: () => void | Promise<void>;
  onSelect?: () => void;
  maxHeightClass?: string;
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t('agent.sessions')}
        </h2>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={t('agent.newSession')} onClick={() => void onCreate()}>
          <Plus className="size-4" />
        </Button>
      </div>
      <ul className={cn('space-y-0.5 overflow-y-auto', maxHeightClass ?? 'max-h-64')}>
        {sessions.map((s) => (
          <li key={s.id}>
            <a
              href={sessionHref(s.id)}
              onClick={onSelect}
              className={cn(
                'group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                sessionId === s.id
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  sessionId === s.id ? 'bg-primary' : 'bg-border-soft group-hover:bg-muted-foreground/40',
                )}
              />
              <span className="truncate">{s.title ?? t('agent.newSession')}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
