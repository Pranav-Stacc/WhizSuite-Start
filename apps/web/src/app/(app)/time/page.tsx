import type { Metadata } from 'next';
import { Clock, Plus, Timer, Users } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { toDateKey } from '@/shared/lib/format';
import { ROLES_LEADERSHIP, ROLES_STAFF } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { HBarList } from '@/shared/ui/charts';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { StatCard } from '@/shared/ui/stat-card';
import { clientsById } from '@/features/clients/services/clients.service';
import { listProjects } from '@/features/projects/services/projects.service';
import { listTasks } from '@/features/tasks/services/tasks.service';
import { membersById } from '@/features/team/services/members.service';
import { LogTimeDialog } from '@/features/time/components/log-time-dialog';
import { TimerCard } from '@/features/time/components/timer-card';
import { formatDuration, TimeEntries } from '@/features/time/components/time-entries';
import { activeTimerFor, listEntries, weekStartKey } from '@/features/time/services/time.service';

export const metadata: Metadata = { title: t('time.title') };

const BASE = '/time';
const RANGES = ['week', 'month', 'all'] as const;
type Range = (typeof RANGES)[number];
const MINUTES_PER_HOUR = 60;

const GUIDE: GuideItem[] = [
  { title: t('time.guide.timer.title'), body: t('time.guide.timer.body') },
  { title: t('time.guide.log.title'), body: t('time.guide.log.body') },
  { title: t('time.guide.team.title'), body: t('time.guide.team.body') },
];

function rangeStart(range: Range): string {
  if (range === 'week') return weekStartKey();
  if (range === 'month') return toDateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  return '';
}

export default async function TimePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_STAFF);
  const sp = await searchParams;
  const isLeader = ROLES_LEADERSHIP.includes(session.role);
  const team = isLeader && param(sp, 'scope') === 'team';
  const range = RANGES.find((r) => r === param(sp, 'range')) ?? 'week';
  const since = rangeStart(range);

  const [entries, projects, clients, members, tasks, timer] = await Promise.all([
    listEntries(),
    listProjects(),
    clientsById(),
    membersById(),
    listTasks(),
    activeTimerFor(session.userId),
  ]);

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const scoped = entries.filter((e) => (team || e.userId === session.userId) && e.date >= since);
  const totalMinutes = scoped.reduce((total, e) => total + e.minutes, 0);
  const billableMinutes = scoped.filter((e) => e.billable).reduce((total, e) => total + e.minutes, 0);

  const sumBy = (key: (e: (typeof scoped)[number]) => string): Map<string, number> => {
    const map = new Map<string, number>();
    for (const e of scoped) map.set(key(e), (map.get(key(e)) ?? 0) + e.minutes);
    return map;
  };
  const byClient = [...sumBy((e) => e.clientId)].sort((a, b) => b[1] - a[1]).map(([id, minutes]) => ({ label: clients.get(id)?.name ?? id, value: minutes / MINUTES_PER_HOUR, color: clients.get(id)?.color }));
  const byPerson = [...sumBy((e) => e.userId)].sort((a, b) => b[1] - a[1]).map(([id, minutes]) => ({ label: members.get(id)?.name ?? id, value: minutes / MINUTES_PER_HOUR }));
  const hours = (value: number): string => t('common.hours', { hours: Math.round(value * 10) / 10 });

  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, ...overrides });
  const rangeLabels: Record<Range, string> = { week: t('time.range.week'), month: t('time.range.month'), all: t('time.range.all') };
  const myOpenTasks = tasks.filter((x) => x.assigneeId === session.userId && x.status !== 'DONE');
  const timerTask = timer ? tasks.find((x) => x.id === timer.taskId) : undefined;

  const rows = scoped.map((e) => ({
    id: e.id,
    date: e.date,
    minutes: e.minutes,
    note: e.note,
    projectLabel: projectsById.get(e.projectId)?.name ?? e.projectId,
    clientColor: clients.get(e.clientId)?.color,
    personName: members.get(e.userId)?.name,
    canDelete: isLeader || e.userId === session.userId,
  }));

  return (
    <div>
      <PageHeader
        title={t('time.title')}
        description={t('time.description')}
        eyebrow={<Timer className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <LogTimeDialog
              defaultOpen={param(sp, 'new') === '1'}
              projects={projects.map((p) => ({ id: p.id, label: `${clients.get(p.clientId)?.name ?? ''} · ${p.name}` }))}
              trigger={
                <Button variant="primary">
                  <Plus />
                  {t('time.log')}
                </Button>
              }
            />
          </>
        }
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <TimerCard running={timer && timerTask ? { taskTitle: timerTask.title, startedAt: timer.startedAt } : undefined} tasks={myOpenTasks.map((x) => ({ id: x.id, title: x.title }))} />
        <StatCard label={t('time.total')} value={<span>{formatDuration(totalMinutes)}</span>} icon={<Clock />} hint={rangeLabels[range]} />
        <StatCard label={t('time.billable')} value={<span>{formatDuration(billableMinutes)}</span>} icon={<Users />} hint={totalMinutes ? `${Math.round((billableMinutes / totalMinutes) * 100)}%` : undefined} />
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FilterChips items={RANGES.map((r) => ({ href: link({ range: r === 'week' ? undefined : r }), label: rangeLabels[r], active: range === r }))} />
        {isLeader ? (
          <FilterChips
            className="ml-auto"
            items={[
              { href: link({ scope: undefined }), label: t('time.scope.mine'), active: !team },
              { href: link({ scope: 'team' }), label: t('time.scope.team'), active: team },
            ]}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('time.entries')} />
          <CardBody className="px-0 pb-0">{rows.length ? <TimeEntries rows={rows} showPerson={team} /> : <EmptyState icon={<Clock />} title={t('time.entries.empty')} />}</CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title={t('time.byClient')} />
            <CardBody>{byClient.length ? <HBarList rows={byClient} format={hours} /> : <p className="text-sm text-muted">{t('time.entries.empty')}</p>}</CardBody>
          </Card>
          {team ? (
            <Card>
              <CardHeader title={t('time.byPerson')} />
              <CardBody>{byPerson.length ? <HBarList rows={byPerson} format={hours} /> : <p className="text-sm text-muted">{t('time.entries.empty')}</p>}</CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
