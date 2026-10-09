import Link from 'next/link';
import { CalendarClock, CheckSquare, Hourglass, MessageSquare, Plus, Users } from 'lucide-react';
import type { Session } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { dueInfo, formatDateTime, relativeTime } from '@/shared/lib/format';
import { Avatar, LogoTile } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ProgressRing } from '@/shared/ui/feedback';
import { PlatformStack } from '@/shared/ui/platform';
import { StatCard } from '@/shared/ui/stat-card';
import { StatusBadge } from '@/shared/ui/status';
import type { GuideItem } from '@/shared/ui/page-guide';
import { clientsById, listClients } from '@/features/clients/services/clients.service';
import { listContent, pendingApprovals } from '@/features/content/services/content.service';
import { unreadChatCount } from '@/features/chat/services/chat.service';
import { overdueTasks } from '@/features/tasks/services/tasks.service';
import { membersById } from '@/features/team/services/members.service';
import { DashboardHeader, ListCard, RowLink } from './dashboard-parts';

const GUIDE: GuideItem[] = [
  { title: t('dashboard.guide.kpi.title'), body: t('dashboard.guide.kpi.body') },
  { title: t('dashboard.guide.tasks.title'), body: t('dashboard.guide.tasks.body') },
  { title: t('dashboard.guide.search.title'), body: t('dashboard.guide.search.body'), shortcut: '⌘K' },
];

const UPCOMING_DAYS = 7;
const APPROVALS_SHOWN = 6;
const WEEK_MS = UPCOMING_DAYS * 24 * 60 * 60 * 1000;

export async function ManagerDashboard({ session }: { session: Session }) {
  const [clients, approvals, overdue, chatUnread, content, byClient, byMember] = await Promise.all([
    listClients(),
    pendingApprovals(),
    overdueTasks(),
    unreadChatCount(),
    listContent(),
    clientsById(),
    membersById(),
  ]);
  const active = clients.filter((c) => c.status === 'ACTIVE');
  const onboarding = clients.filter((c) => c.status === 'ONBOARDING').length;
  const horizon = Date.now() + WEEK_MS;
  const upcoming = content
    .filter((c) => c.scheduledAt && ['SCHEDULED', 'APPROVED'].includes(c.status) && new Date(c.scheduledAt).getTime() <= horizon && new Date(c.scheduledAt).getTime() >= Date.now() - 24 * 3600_000)
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
  const changes = content.filter((c) => c.status === 'CHANGES_REQUESTED');

  return (
    <div className="space-y-6">
      <DashboardHeader
        name={session.name}
        subtitle={t('dashboard.manager.subtitle')}
        guide={GUIDE}
        actions={
          <Button variant="primary" asChild>
            <Link href="/content?new=1">
              <Plus />
              {t('dashboard.quick.newPost')}
            </Link>
          </Button>
        }
      />

      <section aria-label={t('dashboard.kpi.aria')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.kpi.clients')} value={active.length} icon={<Users />} hint={t('dashboard.kpi.clients.hint', { count: onboarding })} href="/clients" />
        <StatCard label={t('dashboard.kpi.approvals')} value={approvals.length} icon={<Hourglass />} hint={t('dashboard.kpi.approvals.hint')} href="/approvals" />
        <StatCard label={t('dashboard.kpi.overdue')} value={overdue.length} icon={<CheckSquare />} hint={t('dashboard.kpi.overdue.hint')} href="/tasks" invertDelta />
        <StatCard label={t('dashboard.kpi.chat')} value={chatUnread} icon={<MessageSquare />} hint={t('dashboard.kpi.chat.hint')} href="/chat" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard title={t('dashboard.attention.title')} description={t('dashboard.attention.desc')} href="/tasks" empty={t('dashboard.attention.empty')} className="lg:col-span-2">
          {overdue.length + changes.length ? (
            <ul className="divide-y divide-border-soft">
              {changes.map((p) => (
                <li key={p.id}>
                  <RowLink href={`/content/${p.id}`} className="py-3">
                    <StatusBadge kind="content" value="CHANGES_REQUESTED" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="block truncate text-xs text-muted">{byClient.get(p.clientId)?.name}</span>
                    </span>
                    <span className="text-xs text-muted">{relativeTime(p.updatedAt)}</span>
                  </RowLink>
                </li>
              ))}
              {overdue.map((task) => {
                const assignees = task.assigneeIds
                  .map((id) => byMember.get(id))
                  .filter((m): m is NonNullable<typeof m> => Boolean(m));
                const due = dueInfo(task.dueDate, false);
                return (
                  <li key={task.id}>
                    <RowLink href={`/tasks?edit=${task.id}`} className="py-3">
                      <Badge tone={due.tone === 'danger' ? 'danger' : 'warning'}>{due.label}</Badge>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{task.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {task.clientId ? byClient.get(task.clientId)?.name : t('tasks.inbox')}
                        </span>
                      </span>
                      {assignees.length > 0 ? (
                        <span className="inline-flex -space-x-1.5">
                          {assignees.slice(0, 3).map((m) => (
                            <Avatar key={m.id} name={m.name} size="xs" />
                          ))}
                        </span>
                      ) : null}
                    </RowLink>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </ListCard>

        <ListCard title={t('dashboard.approvals.title')} description={t('dashboard.approvals.desc')} href="/approvals" empty={t('dashboard.approvals.empty')}>
          {approvals.length ? (
            <ul>
              {approvals.slice(0, APPROVALS_SHOWN).map((p) => {
                const client = byClient.get(p.clientId);
                return (
                  <li key={p.id}>
                    <RowLink href={`/content/${p.id}`}>
                      {client ? <LogoTile name={client.name} color={client.color} size="sm" /> : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.title}</span>
                        <span className="block truncate text-xs text-muted">{client?.contactName}</span>
                      </span>
                      <PlatformStack platforms={p.platforms} size="xs" />
                    </RowLink>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </ListCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard title={t('dashboard.schedule.title')} description={t('dashboard.schedule.desc')} href="/calendar" empty={t('dashboard.schedule.empty')} className="lg:col-span-2">
          {upcoming.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {upcoming.map((p) => (
                <li key={p.id}>
                  <Link href={`/content/${p.id}`} className="flex h-full items-start gap-3 rounded-xl border border-border-soft bg-surface-2/60 p-3 transition hover:border-primary/40">
                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="block text-xs text-muted">{p.scheduledAt ? formatDateTime(p.scheduledAt) : null}</span>
                      <span className="mt-2 block">
                        <PlatformStack platforms={p.platforms} size="xs" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </ListCard>

        <ListCard title={t('dashboard.health.title')} description={t('dashboard.health.desc')} href="/clients" empty={t('dashboard.health.empty')}>
          {active.length ? (
            <ul>
              {[...active].sort((a, b) => a.health - b.health).slice(0, 5).map((c) => (
                <li key={c.id}>
                  <RowLink href={`/clients/${c.id}`}>
                    <LogoTile name={c.name} color={c.color} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                    <ProgressRing value={c.health} size={38} stroke={3.5} />
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : null}
        </ListCard>
      </section>
    </div>
  );
}
