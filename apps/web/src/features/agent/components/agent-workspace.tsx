'use client';

import { useState, useTransition } from 'react';
import type {
  AgentDefinitionDto,
  AgentPendingActionDto,
  AgentRunDto,
  AgentScheduleDto,
  AgentSessionDto,
  CapabilityToolDescriptor,
} from '@agency-os/contracts';
import {
  Bot,
  CheckCircle2,
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
  sendMessageAction,
} from '../actions/agent.actions';
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

export function AgentWorkspace({
  sessions,
  selectedSession,
  messages,
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
  const [draft, setDraft] = useState('');
  const [multiAgent, setMultiAgent] = useState(true);
  const [agentDefinitionId, setAgentDefinitionId] = useState('');
  const [isSending, startTransition] = useTransition();

  const onSend = () => {
    if (!sessionId || !draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    startTransition(async () => {
      await sendMessageAction(sessionId, text, multiAgent, agentDefinitionId || undefined);
    });
  };

  const suggestions = [
    t('agent.empty.suggestions.createClient'),
    t('agent.empty.suggestions.summarize'),
    t('agent.empty.suggestions.tasks'),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-gradient-to-br from-surface via-surface to-surface-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft px-3 py-2">
        <p className="text-xs text-muted">{t('agent.empty.body')}</p>
        <span className="text-[11px] text-muted">
          {t('agent.tools.count', { count: tools.length })}
        </span>
      </div>

      <div className="grid min-h-[min(78vh,44rem)] lg:grid-cols-[260px_minmax(0,1fr)_300px]">
          <aside className="border-b border-border-soft p-4 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{t('agent.sessions')}</h2>
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
            <ul className="max-h-64 space-y-1 overflow-y-auto lg:max-h-[calc(78vh-6rem)]">
              {sessions.map((s) => (
                <li key={s.id}>
                  <a
                    href={`/agent?session=${s.id}`}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-sm transition hover:bg-muted/70',
                      sessionId === s.id && 'bg-muted font-medium',
                    )}
                  >
                    {s.title ?? t('agent.newSession')}
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <section className="flex min-h-0 flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedSession?.title ?? t('agent.title')}</p>
                  <p className="text-xs text-muted">{t('agent.coverage')}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                {definitions.length > 0 ? (
                  <label className="flex items-center gap-2">
                    {t('agent.pickAgent')}
                    <select
                      value={agentDefinitionId}
                      onChange={(e) => setAgentDefinitionId(e.target.value)}
                      className="rounded-md border border-border-soft bg-surface px-2 py-1 text-foreground"
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
                <label className="flex items-center gap-2">
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

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <EmptyState icon={<Bot />} title={t('agent.empty.title')} body={t('agent.empty.body')} />
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'ml-auto bg-primary text-primary-contrast'
                        : 'bg-muted/80 text-foreground',
                    )}
                  >
                    {m.content}
                  </div>
                ))
              )}
              {isSending ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" />
                  {t('agent.thinking')}
                </div>
              ) : null}
            </div>

            {messages.length === 0 ? (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-border-soft bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-primary/40 hover:text-foreground"
                    onClick={() => setDraft(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}

            <footer className="border-t border-border-soft p-4">
              <div className="flex gap-2 rounded-xl border border-border-soft bg-surface p-2 shadow-sm">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('agent.placeholder')}
                  rows={2}
                  className="min-h-[3rem] flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                />
                <Button
                  onClick={onSend}
                  disabled={isSending || !draft.trim() || !sessionId}
                  variant="primary"
                >
                  <Send className="size-4" />
                  {t('agent.send')}
                </Button>
              </div>
            </footer>
          </section>

          <aside className="border-t border-border-soft p-4 lg:border-t-0 lg:border-l">
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Clock className="size-3.5" />
                {t('agent.runs')}
              </h3>
              <ul className="max-h-36 space-y-2 overflow-y-auto text-xs">
                {runs.slice(0, 8).map((run) => (
                  <li key={run.id} className="rounded-lg border border-border-soft px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{run.prompt}</span>
                      <Badge tone={run.status === 'COMPLETED' ? 'success' : 'neutral'}>
                        {run.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {pendingActions.length > 0 ? (
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {t('agent.pending')}
                </h3>
                <ul className="space-y-2">
                  {pendingActions.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs"
                    >
                      <p className="mb-2">{p.summary}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            startTransition(async () => {
                              await confirmPendingAction(p.id);
                            });
                          }}
                        >
                          <CheckCircle2 className="size-3.5" />
                          {t('agent.confirm')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            startTransition(async () => {
                              await rejectPendingAction(p.id);
                            });
                          }}
                        >
                          <XCircle className="size-3.5" />
                          {t('agent.reject')}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Wrench className="size-3.5" />
                {t('agent.tools')}
                <Badge tone="neutral">{tools.length}</Badge>
              </h3>
              <ul className="max-h-52 space-y-1 overflow-y-auto text-[11px] text-muted">
                {tools.map((tool) => (
                  <li key={tool.id} className="truncate rounded px-1 py-0.5 hover:bg-muted/50" title={tool.description}>
                    <span className="text-foreground/80">{tool.module}</span> · {tool.name}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
    </div>
  );
}
