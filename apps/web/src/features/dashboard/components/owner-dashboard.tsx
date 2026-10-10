import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Gauge, HandCoins, Hourglass, Plus, Receipt, TrendingUp, UserPlus } from 'lucide-react';
import { Permissions } from '@agency-os/contracts';
import type { Session } from '@/shared/auth/session';
import { loadIf } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { formatMoney, relativeTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { AreaChart, HBarList } from '@/shared/ui/charts';
import { LogoTile } from '@/shared/ui/avatar';
import { Progress } from '@/shared/ui/feedback';
import { StatCard } from '@/shared/ui/stat-card';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import type { GuideItem } from '@/shared/ui/page-guide';
import { listAudit } from '@/features/audit/services/audit.service';
import { clientsById, listClients, monthlyRecurring } from '@/features/clients/services/clients.service';
import { pendingApprovals, listContent } from '@/features/content/services/content.service';
import { listInvoices, summarize } from '@/features/invoices/services/invoices.service';
import { listLeads, summarizePipeline } from '@/features/leads/services/leads.service';
import { invoicedByMonth, monthLabels } from '@/features/reports/services/reports.service';
import { listTasks, openHoursByAssignee, overdueTasks } from '@/features/tasks/services/tasks.service';
import { listMembers } from '@/features/team/services/members.service';
import type { Member } from '@/features/team/data/members.repository';
import type { Client } from '@/features/clients/data/clients.repository';
import { DashboardHeader, ListCard, RowLink } from './dashboard-parts';

const REVENUE_MONTHS = 7;
const MINOR_PER_MAJOR = 100;
const OVERLOAD_RATIO = 0.9;

const GUIDE: GuideItem[] = [
  { title: t('dashboard.guide.kpi.title'), body: t('dashboard.guide.kpi.body') },
  { title: t('dashboard.guide.search.title'), body: t('dashboard.guide.search.body'), shortcut: '⌘K' },
  { title: t('dashboard.guide.create.title'), body: t('dashboard.guide.create.body') },
  { title: t('dashboard.guide.theme.title'), body: t('dashboard.guide.theme.body') },
];

export async function OwnerDashboard({ session }: { session: Session }) {
  const [clients, invoices, leads, approvals, tasks, overdue, members, audit, content, byClient] = await Promise.all([
    loadIf(Permissions.CLIENTS_VIEW, listClients, []),
    loadIf(Permissions.INVOICES_VIEW, listInvoices, []),
    loadIf(Permissions.LEADS_VIEW, listLeads, []),
    loadIf(Permissions.APPROVALS_VIEW, pendingApprovals, []),
    loadIf(Permissions.TASKS_VIEW, listTasks, []),
    loadIf(Permissions.TASKS_VIEW, overdueTasks, []),
    loadIf(Permissions.MEMBERS_VIEW, listMembers, [] as Member[]),
    loadIf(Permissions.AUDIT_VIEW, listAudit, []),
    loadIf(Permissions.CONTENT_VIEW, listContent, []),
    loadIf(Permissions.CLIENTS_VIEW, clientsById, new Map<string, Client>()),
  ]);
  const receivables = summarize(invoices);
  const pipeline = summarizePipeline(leads);
  const mrr = monthlyRecurring(clients);
  const activeClients = clients.filter((c) => c.status === 'ACTIVE');
  const invoiced = invoicedByMonth(invoices, REVENUE_MONTHS);
  const revenue = invoiced.map((v) => Math.round(v / MINOR_PER_MAJOR));

  const hours = openHoursByAssignee(tasks);
  const workload = members
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => ({ member: m, used: hours.get(m.id) ?? 0 }))
    .sort((a, b) => b.used / b.member.capacityHours - a.used / a.member.capacityHours);

  const slipping = [
    ...invoices.filter((i) => i.status === 'OVERDUE').map((i) => ({ key: `inv-${i.id}`, href: `/invoices/${i.id}`, label: t('dashboard.attention.invoice', { number: i.number }), tone: 'danger' as const, icon: <Receipt className="size-4" /> })),
    ...overdue.slice(0, 3).map((x) => ({ key: `task-${x.id}`, href: `/tasks?edit=${x.id}`, label: t('dashboard.attention.task', { title: x.title }), tone: 'warning' as const, icon: <Clock className="size-4" /> })),
    ...content.filter((c) => c.status === 'CHANGES_REQUESTED').map((c) => ({ key: `post-${c.id}`, href: `/content/${c.id}`, label: t('dashboard.attention.changes', { title: c.title }), tone: 'warning' as const, icon: <AlertTriangle className="size-4" /> })),
  ].slice(0, 6);

  const lowHealth = [...activeClients].sort((a, b) => a.health - b.health).slice(0, 4);

  return (
    <div className="space-y-6">
      <DashboardHeader
        name={session.name}
        subtitle={t('dashboard.owner.subtitle', { org: session.orgName })}
        guide={GUIDE}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/clients?new=1">
                <UserPlus />
                {t('dashboard.quick.newClient')}
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href="/invoices?new=1">
                <Plus />
                {t('dashboard.quick.newInvoice')}
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label={t('dashboard.kpi.aria')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.kpi.mrr')} value={formatMoney(mrr, undefined, true)} icon={<TrendingUp />} hint={t('dashboard.kpi.mrr.hint', { count: activeClients.length })} href="/clients" />
        <StatCard label={t('dashboard.kpi.outstanding')} value={formatMoney(receivables.outstanding, undefined, true)} icon={<HandCoins />} hint={t('dashboard.kpi.outstanding.hint', { overdue: formatMoney(receivables.overdue, undefined, true) })} href="/invoices" />
        <StatCard label={t('dashboard.kpi.pipeline')} value={formatMoney(pipeline.weighted, undefined, true)} icon={<Gauge />} hint={t('dashboard.kpi.pipeline.hint', { open: formatMoney(pipeline.open, undefined, true) })} href="/leads" />
        <StatCard label={t('dashboard.kpi.approvals')} value={approvals.length} icon={<Hourglass />} hint={t('dashboard.kpi.approvals.hint')} href="/approvals" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard title={t('dashboard.revenue.title')} description={t('dashboard.revenue.desc')} href="/reports" className="lg:col-span-2">
          <AreaChart height={250} labels={monthLabels(REVENUE_MONTHS)} series={[{ label: t('dashboard.revenue.title'), data: revenue }]} format={(v) => formatMoney(v * MINOR_PER_MAJOR, undefined, true)} />
        </ListCard>
        <ListCard title={t('dashboard.pipeline.title')} description={t('dashboard.pipeline.desc')} href="/leads">
          <HBarList
            format={(v) => formatMoney(v, undefined, true)}
            rows={pipeline.stages
              .filter((s) => s.stage !== 'LOST')
              .map((s) => ({ label: statusLabel('lead', s.stage), value: s.value, sub: String(s.count), color: TONE_COLOR[statusTone('lead', s.stage)] }))}
          />
        </ListCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard title={t('dashboard.attention.title')} description={t('dashboard.attention.desc')} empty={t('dashboard.attention.empty')}>
          {slipping.length ? (
            <ul>
              {slipping.map((item) => (
                <li key={item.key}>
                  <RowLink href={item.href}>
                    <span className={item.tone === 'danger' ? 'text-danger' : 'text-warning'}>{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : null}
        </ListCard>

        <ListCard title={t('dashboard.workload.title')} description={t('dashboard.workload.desc')} href="/team" empty={t('dashboard.workload.empty')}>
          {workload.length ? (
          <ul className="space-y-3.5">
            {workload.map(({ member, used }) => {
              const ratio = used / member.capacityHours;
              return (
                <li key={member.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar name={member.name} size="xs" />
                      <span className="truncate">{member.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">{t('dashboard.workload.hours', { hours: used, capacity: member.capacityHours })}</span>
                  </div>
                  <Progress value={ratio * 100} tone={ratio > 1 ? 'danger' : ratio > OVERLOAD_RATIO ? 'warning' : 'primary'} />
                </li>
              );
            })}
          </ul>
          ) : null}
        </ListCard>

        <ListCard title={t('dashboard.health.title')} description={t('dashboard.health.desc')} href="/clients" empty={t('dashboard.health.empty')}>
          {lowHealth.length ? (
          <ul>
            {lowHealth.map((c) => (
              <li key={c.id}>
                <RowLink href={`/clients/${c.id}`}>
                  <LogoTile name={c.name} color={c.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    <Progress value={c.health} tone={c.health < 50 ? 'danger' : c.health < 75 ? 'warning' : 'primary'} className="mt-1.5" />
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{c.health}%</span>
                </RowLink>
              </li>
            ))}
          </ul>
          ) : null}
        </ListCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard title={t('dashboard.approvals.title')} description={t('dashboard.approvals.desc')} href="/approvals" empty={t('dashboard.approvals.empty')}>
          {approvals.length ? (
            <ul>
              {approvals.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <RowLink href={`/content/${p.id}`}>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: byClient.get(p.clientId)?.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="block truncate text-xs text-muted">{byClient.get(p.clientId)?.name}</span>
                    </span>
                    <CheckCircle2 className="size-4 text-muted" />
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : null}
        </ListCard>

        <ListCard title={t('dashboard.activity.title')} description={t('dashboard.activity.desc')} href="/audit" className="lg:col-span-2" empty={t('dashboard.activity.empty')}>
          {audit.length ? (
          <ul className="divide-y divide-border-soft">
            {audit.slice(0, 6).map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={entry.actorName} size="xs" />
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{entry.actorName}</span> <span className="text-muted">{entry.summary}</span> <span className="text-foreground/80">{entry.entityLabel}</span>
                </p>
                <time className="shrink-0 text-xs text-muted" dateTime={entry.at}>
                  {relativeTime(entry.at)}
                </time>
              </li>
            ))}
          </ul>
          ) : null}
        </ListCard>
      </section>
    </div>
  );
}
