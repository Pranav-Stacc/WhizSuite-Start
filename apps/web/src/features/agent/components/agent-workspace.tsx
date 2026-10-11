'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AgentDefinitionDto,
  AgentPendingActionDto,
  AgentRunDto,
  AgentScheduleDto,
  AgentSessionDto,
  AgentStreamEvent,
} from '@agency-os/contracts';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  List,
  Loader2,
  Plus,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  confirmPendingAction,
  createSessionAction,
  rejectPendingAction,
} from '../actions/agent.actions';
import { AgentMarkdown } from './agent-markdown';
import {
  applyStreamEvent,
  formatStepDetail,
  formatToolId,
  type StreamState,
} from '../utils/agent-stream-state';
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

function parseSseEvents(chunk: string): AgentStreamEvent[] {
  const events: AgentStreamEvent[] = [];
  for (const part of chunk.split('\n\n')) {
    const line = part
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('data:'));
    const payload = line?.slice(5).trim();
    if (!payload) continue;
    try {
      events.push(JSON.parse(payload) as AgentStreamEvent);
    } catch {
      continue;
    }
  }
  return events;
}

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
  const [stream, setStream] = useState<StreamState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPendingAction, startTransition] = useTransition();
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isStreaming = stream !== null;

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setLocalPending(pendingActions);
  }, [pendingActions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, stream?.text, stream?.status]);

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

  const onSend = async (textOverride?: string) => {
    if (!sessionId || isStreaming) return;
    const text = (textOverride ?? draft).trim();
    if (!text) return;

    setDraft('');
    setError(null);
    appendMessage('user', text);
    setStream({ status: t('agent.thinking'), text: '', steps: [] });

    let finalText = '';
    try {
      const res = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text,
          agentDefinitionId: agentDefinitionId || undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || t('agent.error.stream'));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const boundary = buffer.lastIndexOf('\n\n');
        if (boundary === -1) continue;
        const complete = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const event of parseSseEvents(complete)) {
          if (event.type === 'done') {
            finalText = event.response || finalText;
            finished = true;
          } else if (event.type === 'error') {
            throw new Error(event.message);
          } else {
            setStream((prev) => {
              const next = applyStreamEvent(prev, event);
              if (event.type === 'summary.delta') {
                finalText = next.text;
              }
              return next;
            });
          }
        }
      }

      if (finalText) appendMessage('assistant', finalText);
    } catch (err) {
      if (finalText) appendMessage('assistant', finalText);
      setError(err instanceof Error ? err.message : t('agent.error.stream'));
    } finally {
      setStream(null);
    }
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
          'relative grid lg:grid-cols-[240px_minmax(0,1fr)_260px]',
          embedded ? 'min-h-0 flex-1' : 'min-h-[min(78vh,46rem)]',
        )}
      >
        <aside className="hidden border-b border-border-soft/80 p-3 lg:block lg:border-b-0 lg:border-r">
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
            className="flex-1 space-y-4 overflow-y-auto px-4 py-5"
            aria-live="polite"
            aria-busy={isStreaming}
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
                {stream ? (
                  <StreamingBubble
                    stream={stream}
                    onToggleStep={(index) =>
                      setStream((prev) => {
                        if (!prev) return prev;
                        const steps = prev.steps.map((step, i) =>
                          i === index ? { ...step, expanded: !step.expanded } : step,
                        );
                        return { ...prev, steps };
                      })
                    }
                  />
                ) : null}
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
            <div ref={bottomRef} />
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
              className="flex gap-2 rounded-2xl border border-border-soft bg-surface-2/40 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-within:border-sky-500/40"
              onSubmit={(e) => {
                e.preventDefault();
                void onSend();
              }}
            >
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
                disabled={isStreaming || !draft.trim() || !sessionId}
                variant="primary"
                className="self-end"
              >
                <Send className="size-4" />
                {t('agent.send')}
              </Button>
            </form>
          </footer>
        </section>

        <aside className="hidden border-t border-border-soft/80 p-4 lg:block lg:border-t-0 lg:border-l">
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
            ? 'whitespace-pre-wrap rounded-tr-md bg-primary text-primary-contrast'
            : 'rounded-tl-md border border-border-soft/70 bg-surface-2/70 text-foreground',
        )}
      >
        {isUser ? content : <AgentMarkdown content={content} />}
      </div>
    </div>
  );
}

function StreamingBubble({
  stream,
  onToggleStep,
}: {
  stream: StreamState;
  onToggleStep: (index: number) => void;
}) {
  const showCursor = stream.text.length > 0 && stream.status === t('agent.phase.summarizing');

  return (
    <div className="mr-auto max-w-[90%]">
      <div className="rounded-2xl rounded-tl-md border border-border-soft/70 bg-surface-2/70 px-4 py-3 text-sm shadow-sm">
        <div className="mb-3 flex items-center gap-3 text-muted">
          {stream.text ? null : <TypingDots />}
          <span className="text-xs font-medium">{stream.statusDetail ?? stream.status}</span>
        </div>

        {stream.steps.length > 0 ? (
          <div className="mb-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('agent.stream.steps')}
            </p>
            {stream.steps.map((step, index) => {
              const detail = formatStepDetail(step);
              return (
                <div key={`${step.callId ?? step.toolId}-${index}`} className="rounded-lg border border-border-soft/60 bg-surface/40">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-2.5 py-2 text-left"
                    onClick={() => detail && onToggleStep(index)}
                    disabled={!detail}
                  >
                    {step.running ? (
                      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-sky-400" />
                    ) : step.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
                    )}
                    <span className="min-w-0 flex-1 text-xs font-medium">{formatToolId(step.toolId)}</span>
                    {detail ? (
                      step.expanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted" />
                      )
                    ) : null}
                  </button>
                  {step.expanded && detail ? (
                    <pre className="overflow-x-auto border-t border-border-soft/50 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
                      {detail}
                    </pre>
                  ) : null}
                  {!step.expanded && step.error ? (
                    <p className="px-2.5 pb-2 text-[11px] text-red-300">{step.error}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {stream.text ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('agent.stream.answer')}
            </p>
            <AgentMarkdown content={stream.text} />
            {showCursor ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-sky-400/80 align-middle"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span aria-hidden className="flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-sky-400/80"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
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
