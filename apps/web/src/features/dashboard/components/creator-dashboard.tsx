import Link from 'next/link';
import { Clock, KanbanSquare, MessageSquare, PencilLine, Plus } from 'lucide-react';
import type { Session } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { dueInfo, formatNumber, relativeTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ProgressRing } from '@/shared/ui/feedback';
import { PlatformStack } from '@/shared/ui/platform';
import { StatCard } from '@/shared/ui/stat-card';
import { StatusBadge } from '@/shared/ui/status';
import type { GuideItem } from '@/shared/ui/page-guide';
import { clientsById } from '@/features/clients/services/clients.service';
import { allEvents, listContent } from '@/features/content/services/content.service';
import { TimerCard } from '@/features/time/components/timer-card';
import { activeTimerFor, listEntries, minutesThisWeek } from '@/features/time/services/time.service';
import { isOverdue, listTasks } from '@/features/tasks/services/tasks.service';
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/features/team/config';
import { membersById } from '@/features/team/services/members.service';
import { DashboardHeader, ListCard, RowLink } from './dashboard-parts';

const MINUTES_PER_HOUR = 60;

const GUIDE: GuideItem[] = [
  { title: t('dashboard.guide.timer.title'), body: t('dashboard.guide.timer.body') },
  { title: t('dashboard.guide.tasks.title'), body: t('dashboard.guide.tasks.body') },
  { title: t('dashboard.guide.search.title'), body: t('dashboard.guide.search.body'), shortcut: '⌘K' },
];

export async function CreatorDashboard({ session }: { session: Session }) {
  const [tasks, content, events, entries, timer, byClient, byMember] = await Promise.all([
    listTasks(),
    listContent(),
    allEvents(),
    listEntries(),
    activeTimerFor(session.userId),
    clientsById(),
    membersById(),
  ]);
  const me = byMember.get(session.userId);
  const mine = tasks.filter((x) => x.assigneeIds.includes(session.userId) && x.status !== 'DONE');
  const sorted = [...mine].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'));
  const myPosts = content.filter((c) => c.authorId === session.userId);
  const myPostIds = new Set(myPosts.map((p) => p.id));
  const feedback = events.filter((e) => myPostIds.has(e.contentId) && ['comment', 'changes', 'approved', 'rejected'].includes(e.kind)).sort((a, b) => b.at.localeCompare(a.at));
  const drafts = myPosts.filter((p) => p.status === 'DRAFT' || p.status === 'CHANGES_REQUESTED');
  const weekMinutes = minutesThisWeek(entries, session.userId);
  const capacity = me?.capacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS;
  const weekHours = weekMinutes / MINUTES_PER_HOUR;
  const completed = tasks.filter((x) => x.assigneeIds.includes(session.userId) && x.status === 'DONE').length;
  const timerTask = timer ? tasks.find((x) => x.id === timer.taskId) : undefined;

  return (
    <div className="space-y-6">
      <DashboardHeader
        name={session.name}
        subtitle={t('dashboard.creator.subtitle')}
        guide={GUIDE}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/tasks">
                <KanbanSquare />
                {t('dashboard.myTasks.board')}
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href="/content?new=1">
                <Plus />
                {t('dashboard.quick.newPost')}
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <TimerCard
          running={timer && timerTask ? { taskTitle: timerTask.title, startedAt: timer.startedAt } : undefined}
          tasks={mine.map((x) => ({ id: x.id, title: x.title }))}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard label={t('dashboard.kpi.hours')} value={t('common.hours', { hours: formatNumber(Math.round(weekHours * 10) / 10) })} icon={<Clock />} hint={t('dashboard.kpi.hours.hint', { capacity })} href="/time" />
          <div className="card-surface flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-[13px] font-medium text-muted">{t('dashboard.myTasks.title')}</p>
              <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums">{mine.length}</p>
              <p className="mt-2 text-xs text-muted">{t('dashboard.myTasks.completed', { count: completed })}</p>
            </div>
            <ProgressRing value={(weekHours / capacity) * 100} size={76} stroke={6} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard title={t('dashboard.myTasks.title')} description={t('dashboard.myTasks.desc')} href="/tasks" empty={t('dashboard.myTasks.empty')} className="lg:col-span-2">
          {sorted.length ? (
            <ul className="divide-y divide-border-soft">
              {sorted.map((task) => {
                const due = dueInfo(task.dueDate, false);
                return (
                  <li key={task.id}>
                    <RowLink href={`/tasks?edit=${task.id}`} className="py-3">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: task.clientId ? byClient.get(task.clientId)?.color : undefined }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{task.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {task.clientId ? byClient.get(task.clientId)?.name : t('tasks.inbox')}
                        </span>
                      </span>
                      <StatusBadge kind="priority" value={task.priority} dot={false} />
                      <Badge tone={due.tone === 'danger' ? 'danger' : due.tone === 'warning' ? 'warning' : 'neutral'}>{due.label}</Badge>
                    </RowLink>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </ListCard>

        <div className="space-y-4">
          <ListCard title={t('dashboard.feedback.title')} description={t('dashboard.feedback.desc')} empty={t('dashboard.feedback.empty')}>
            {feedback.length ? (
              <ul className="space-y-3">
                {feedback.slice(0, 4).map((e) => (
                  <li key={e.id}>
                    <RowLink href={`/content/${e.contentId}`} className="items-start">
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-[13px]">{e.body}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {e.actorName} · {relativeTime(e.at)}
                        </span>
                      </span>
                    </RowLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </ListCard>

          <ListCard title={t('dashboard.drafts.title')} description={t('dashboard.drafts.desc')} href="/content" empty={t('dashboard.drafts.empty')}>
            {drafts.length ? (
              <ul>
                {drafts.map((p) => (
                  <li key={p.id}>
                    <RowLink href={`/content/${p.id}`}>
                      <PencilLine className="size-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                      <PlatformStack platforms={p.platforms} size="xs" />
                    </RowLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </ListCard>
        </div>
      </section>
    </div>
  );
}
