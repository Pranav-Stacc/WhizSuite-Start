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
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  confirmPendingAction,
  createDefinitionAction,
  createScheduleAction,
  createSessionAction,
  pauseScheduleAction,
  rejectPendingAction,
  resumeScheduleAction,
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

type Tab = 'chat' | 'agents' | 'schedules';

export function AgentWorkspace({
  sessions,
  selectedSession,
  messages,
  runs,
  pendingActions,
  tools,
  definitions,
  schedules,
  sessionId,
  canManageAgents,
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
  const [tab, setTab] = useState<Tab>('chat');
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

  const tabs: Array<{ id: Tab; label: string; icon: typeof Sparkles }> = [
    { id: 'chat', label: t('agent.tab.chat'), icon: Sparkles },
    { id: 'agents', label: t('agent.tab.agents'), icon: Users },
    { id: 'schedules', label: t('agent.tab.schedules'), icon: CalendarClock },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-gradient-to-br from-surface via-surface to-surface-2">
      <div className="flex flex-wrap items-center gap-1 border-b border-border-soft px-3 py-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                tab === item.id
                  ? 'bg-foreground text-background'
                  : 'text-muted hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto text-[11px] text-muted">
          {t('agent.tools.count', { count: tools.length })}
        </span>
      </div>

      {tab === 'chat' ? (
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
      ) : null}

      {tab === 'agents' ? (
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">{t('agent.agents')}</h2>
            {definitions.length === 0 ? (
              <p className="text-sm text-muted">{t('agent.empty.body')}</p>
            ) : (
              <ul className="space-y-2">
                {definitions.map((d) => (
                  <li key={d.id} className="rounded-xl border border-border-soft p-4">
                    <p className="font-medium">{d.name}</p>
                    {d.description ? <p className="mt-1 text-xs text-muted">{d.description}</p> : null}
                    <p className="mt-2 line-clamp-3 text-xs text-muted">{d.systemPrompt}</p>
                    {d.subAgents.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {d.subAgents.map((s) => (
                          <Badge key={s.name} tone="neutral">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {canManageAgents ? (
            <form action={createDefinitionAction} className="space-y-3 rounded-xl border border-border-soft p-4">
              <h3 className="text-sm font-semibold">{t('agent.agent.new')}</h3>
              <label className="block text-xs">
                {t('agent.definition.name')}
                <input name="name" required className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs">
                {t('agent.definition.description')}
                <input name="description" className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs">
                {t('agent.definition.prompt')}
                <textarea name="systemPrompt" required rows={5} className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs">
                {t('agent.definition.subAgents')}
                <textarea
                  name="subAgents"
                  rows={3}
                  placeholder="Researcher: gather data&#10;Executor: run tools"
                  className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
                />
              </label>
              <Button type="submit" variant="primary">
                {t('agent.definition.create')}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {tab === 'schedules' ? (
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">{t('agent.schedules')}</h2>
            {schedules.length === 0 ? (
              <p className="text-sm text-muted">{t('agent.empty.body')}</p>
            ) : (
              <ul className="space-y-2">
                {schedules.map((s) => (
                  <li key={s.id} className="rounded-xl border border-border-soft p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {s.cron} · {s.timezone}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs">{s.prompt}</p>
                      </div>
                      <Badge tone={s.status === 'ACTIVE' ? 'success' : 'neutral'}>{s.status}</Badge>
                    </div>
                    {canManageAgents ? (
                      <div className="mt-3 flex gap-2">
                        {s.status === 'ACTIVE' ? (
                          <Button
                            size="sm"
                            variant="soft"
                            onClick={() => {
                              startTransition(async () => {
                                await pauseScheduleAction(s.id);
                              });
                            }}
                          >
                            {t('agent.schedule.pause')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              startTransition(async () => {
                                await resumeScheduleAction(s.id);
                              });
                            }}
                          >
                            {t('agent.schedule.resume')}
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {canManageAgents ? (
            <form action={createScheduleAction} className="space-y-3 rounded-xl border border-border-soft p-4">
              <h3 className="text-sm font-semibold">{t('agent.schedule.new')}</h3>
              <label className="block text-xs">
                {t('agent.schedule.name')}
                <input name="name" required className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs">
                {t('agent.schedule.prompt')}
                <textarea name="prompt" required rows={4} className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs">
                {t('agent.schedule.cron')}
                <input name="cron" required defaultValue="0 9 * * 1" className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs">
                {t('agent.schedule.timezone')}
                <input name="timezone" defaultValue="UTC" className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
              </label>
              {definitions.length > 0 ? (
                <label className="block text-xs">
                  {t('agent.pickAgent')}
                  <select name="agentDefinitionId" className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm">
                    <option value="">{t('agent.pickAgent.default')}</option>
                    {definitions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Button type="submit" variant="primary">
                {t('agent.schedule.create')}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
