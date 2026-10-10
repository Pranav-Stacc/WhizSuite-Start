'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AgentDefinitionDto,
  AgentPendingActionDto,
  AgentRunDto,
  AgentScheduleDto,
  AgentSessionDto,
  AgentStreamEvent,
  CapabilityToolDescriptor,
} from '@agency-os/contracts';
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  confirmPendingAction,
  createSessionAction,
  rejectPendingAction,
} from '../actions/agent.actions';
import { AgentMarkdown } from './agent-markdown';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface LiveTool {
  toolId: string;
  status: 'running' | 'ok' | 'error';
  error?: string;
}

interface StreamState {
  phase: 'planning' | 'executing' | 'summarizing' | null;
  detail?: string;
  planSummary?: string;
  tools: LiveTool[];
  text: string;
}

export function AgentWorkspace({
  sessions,
  selectedSession,
  messages: initialMessages,
  runs,
  pendingActions,
  tools,
  definitions,
  sessionId,
}: {
  sessions: AgentSessionDto[];
  selectedSession: AgentSessionDto | null;
  messages: Message[];
  runs: AgentRunDto[];
  pendingActions: AgentPendingActionDto[];
  tools: CapabilityToolDescriptor[];
  definitions: AgentDefinitionDto[];
  schedules: AgentScheduleDto[];
  sessionId?: string;
  canManageAgents: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [multiAgent, setMultiAgent] = useState(true);
  const [agentDefinitionId, setAgentDefinitionId] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPendingAction, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, stream?.text, stream?.tools.length, stream?.phase]);

  const toolsByModule = useMemo(() => {
    const map = new Map<string, CapabilityToolDescriptor[]>();
    for (const tool of tools) {
      const list = map.get(tool.module) ?? [];
      list.push(tool);
      map.set(tool.module, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tools]);

  const suggestions = [
    t('agent.empty.suggestions.createClient'),
    t('agent.empty.suggestions.summarize'),
    t('agent.empty.suggestions.tasks'),
    t('agent.empty.suggestions.tools'),
  ];

  const onSend = async (textOverride?: string) => {
    if (!sessionId || isSending) return;
    const text = (textOverride ?? draft).trim();
    if (!text) return;

    setDraft('');
    setError(null);
    setIsSending(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `local-user-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setStream({
      phase: 'planning',
      detail: t('agent.phase.planning'),
      tools: [],
      text: '',
    });

    try {
      const res = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text,
          multiAgent,
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
      let finalText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.startsWith('data:'));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;

          let event: AgentStreamEvent;
          try {
            event = JSON.parse(payload) as AgentStreamEvent;
          } catch {
            continue;
          }

          if (event.type === 'status') {
            setStream((prev) => ({
              phase: event.phase,
              detail: event.detail,
              planSummary: prev?.planSummary,
              tools: prev?.tools ?? [],
              text: prev?.text ?? '',
            }));
          } else if (event.type === 'plan') {
            setStream((prev) => ({
              phase: prev?.phase ?? 'planning',
              detail: prev?.detail,
              planSummary: event.summary,
              tools: prev?.tools ?? [],
              text: prev?.text ?? '',
            }));
          } else if (event.type === 'tool.start') {
            setStream((prev) => ({
              phase: 'executing',
              detail: event.toolId,
              planSummary: prev?.planSummary,
              tools: [
                ...(prev?.tools.filter((x) => x.toolId !== event.toolId) ?? []),
                { toolId: event.toolId, status: 'running' },
              ],
              text: prev?.text ?? '',
            }));
          } else if (event.type === 'tool.result') {
            setStream((prev) => ({
              phase: 'executing',
              detail: event.toolId,
              planSummary: prev?.planSummary,
              tools: (prev?.tools ?? []).map((x) =>
                x.toolId === event.toolId
                  ? {
                      toolId: event.toolId,
                      status: event.ok ? 'ok' : 'error',
                      error: event.error,
                    }
                  : x,
              ),
              text: prev?.text ?? '',
            }));
          } else if (event.type === 'summary.delta') {
            finalText += event.text;
            const next = finalText;
            setStream((prev) => ({
              phase: 'summarizing',
              detail: t('agent.phase.summarizing'),
              planSummary: prev?.planSummary,
              tools: prev?.tools ?? [],
              text: next,
            }));
          } else if (event.type === 'done') {
            finalText = event.response || finalText;
            setMessages((prev) => [
              ...prev,
              {
                id: `local-assistant-${Date.now()}`,
                role: 'assistant',
                content: finalText,
                createdAt: new Date().toISOString(),
              },
            ]);
            setStream(null);
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agent.error.stream'));
      setStream((prev) => {
        if (prev?.text) {
          setMessages((msgs) => [
            ...msgs,
            {
              id: `local-assistant-partial-${Date.now()}`,
              role: 'assistant',
              content: prev.text,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
        return null;
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.07),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(251,146,60,0.05),_transparent_45%)]"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-border-soft/80 px-4 py-2.5">
        <p className="text-xs text-muted">{t('agent.empty.body')}</p>
        <span className="rounded-md border border-border-soft/70 bg-surface-2/60 px-2 py-0.5 text-[11px] tabular-nums text-muted">
          {t('agent.tools.count', { count: tools.length })}
        </span>
      </div>

      <div className="relative grid min-h-[min(78vh,46rem)] lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <aside className="border-b border-border-soft/80 p-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t('agent.sessions')}
            </h2>
            <form
              action={async () => {
                await createSessionAction();
              }}
            >
              <Button type="submit" size="icon-sm" variant="ghost" aria-label={t('agent.newSession')}>
                <Plus className="size-4" />
              </Button>
            </form>
          </div>
          <ul className="max-h-64 space-y-0.5 overflow-y-auto lg:max-h-[calc(78vh-5.5rem)]">
            {sessions.map((s) => (
              <li key={s.id}>
                <a
                  href={`/agent?session=${s.id}`}
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
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-amber-500/10 text-sky-300 ring-1 ring-sky-500/20">
                <Sparkles className="size-4" />
                {isSending ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-sky-400" />
                ) : null}
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  {selectedSession?.title ?? t('agent.title')}
                </p>
                <p className="text-[11px] text-muted">{t('agent.coverage')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              {definitions.length > 0 ? (
                <label className="flex items-center gap-2">
                  {t('agent.pickAgent')}
                  <select
                    value={agentDefinitionId}
                    onChange={(e) => setAgentDefinitionId(e.target.value)}
                    className="rounded-lg border border-border-soft bg-surface-2/80 px-2 py-1 text-foreground"
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
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-soft/70 bg-surface-2/40 px-2.5 py-1">
                <input
                  type="checkbox"
                  checked={multiAgent}
                  onChange={(e) => setMultiAgent(e.target.checked)}
                  className="rounded border-border-soft"
                />
                {t('agent.multiAgent')}
              </label>
            </div>
          </header>

          <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
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
                  <div className="mr-auto max-w-[92%] space-y-3">
                    <ActivityStrip stream={stream} />
                    {stream.tools.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {stream.tools.map((tool) => (
                          <ToolChip key={tool.toolId} tool={tool} />
                        ))}
                      </div>
                    ) : null}
                    {stream.text ? (
                      <div className="rounded-2xl rounded-tl-md border border-border-soft/70 bg-surface-2/70 px-4 py-3 shadow-sm">
                        <AgentMarkdown content={stream.text} />
                        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-sky-400/80 align-middle" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <Loader2 className="size-3.5 animate-spin text-sky-400" />
                        {stream.detail ?? t('agent.thinking')}
                      </div>
                    )}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {pendingActions.length > 0 ? (
            <div className="space-y-2 border-t border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
              {pendingActions.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-surface/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
                      {t('agent.pending')}
                    </p>
                    <p className="truncate text-sm">{p.summary}</p>
                    <p className="font-mono text-[10px] text-muted">{p.toolId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={isPendingAction}
                      onClick={() => {
                        startTransition(async () => {
                          await confirmPendingAction(p.id);
                          router.refresh();
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
                          router.refresh();
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
            <div className="flex gap-2 rounded-2xl border border-border-soft bg-surface-2/40 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-within:border-sky-500/40">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('agent.placeholder')}
                rows={2}
                disabled={isSending}
                className="min-h-[3rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted/70"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
              />
              <Button
                onClick={() => void onSend()}
                disabled={isSending || !draft.trim() || !sessionId}
                variant="primary"
                className="self-end"
              >
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {t('agent.send')}
              </Button>
            </div>
          </footer>
        </section>

        <aside className="space-y-5 border-t border-border-soft/80 p-4 lg:border-t-0 lg:border-l">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <Clock className="size-3.5" />
              {t('agent.runs')}
            </h3>
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {runs.slice(0, 8).map((run) => (
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
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <Wrench className="size-3.5" />
              {t('agent.tools')}
              <Badge tone="neutral">{tools.length}</Badge>
            </h3>
            <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
              {toolsByModule.map(([module, moduleTools]) => (
                <details key={module} className="group rounded-xl border border-border-soft/60 bg-surface-2/20">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-foreground/80">
                    <ChevronRight className="size-3.5 transition group-open:rotate-90" />
                    <span className="capitalize">{module}</span>
                    <span className="ml-auto tabular-nums text-muted">{moduleTools.length}</span>
                  </summary>
                  <ul className="space-y-0.5 border-t border-border-soft/50 px-2 py-1.5">
                    {moduleTools.map((tool) => (
                      <li
                        key={tool.id}
                        className="truncate rounded-md px-1.5 py-1 text-[11px] text-muted hover:bg-muted/40 hover:text-foreground"
                        title={tool.description}
                      >
                        {tool.name}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'max-w-[90%]',
        isUser ? 'ml-auto' : 'mr-auto',
      )}
    >
      <div
        className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'rounded-tr-md bg-primary text-primary-contrast'
            : 'rounded-tl-md border border-border-soft/70 bg-surface-2/70 text-foreground',
        )}
      >
        {isUser ? content : <AgentMarkdown content={content} />}
      </div>
    </div>
  );
}

function ActivityStrip({ stream }: { stream: StreamState }) {
  const phases = [
    { id: 'planning', label: t('agent.step.planner') },
    { id: 'executing', label: t('agent.step.executor') },
    { id: 'summarizing', label: t('agent.step.critic') },
  ] as const;
  const activeIdx = phases.findIndex((p) => p.id === stream.phase);

  return (
    <div className="rounded-xl border border-border-soft/60 bg-surface/70 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {phases.map((phase, idx) => {
          const active = idx === activeIdx;
          const done = activeIdx > idx;
          return (
            <div key={phase.id} className="flex items-center gap-2">
              {idx > 0 ? <span className="h-px w-3 bg-border-soft" /> : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]',
                  active && 'bg-sky-500/15 text-sky-200',
                  done && 'text-emerald-300/90',
                  !active && !done && 'text-muted',
                )}
              >
                {active ? <Loader2 className="size-3 animate-spin" /> : null}
                {done ? <CheckCircle2 className="size-3" /> : null}
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
      {stream.planSummary ? (
        <p className="mt-1.5 text-[11px] text-muted">{stream.planSummary}</p>
      ) : null}
    </div>
  );
}

function ToolChip({ tool }: { tool: LiveTool }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]',
        tool.status === 'running' && 'border-sky-500/30 bg-sky-500/10 text-sky-200',
        tool.status === 'ok' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        tool.status === 'error' && 'border-red-500/30 bg-red-500/10 text-red-200',
      )}
      title={tool.error}
    >
      {tool.status === 'running' ? <Loader2 className="size-3 animate-spin" /> : null}
      {tool.status === 'ok' ? <CheckCircle2 className="size-3" /> : null}
      {tool.status === 'error' ? <XCircle className="size-3" /> : null}
      {tool.toolId}
    </span>
  );
}
