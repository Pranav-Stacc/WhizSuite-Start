import type { Metadata } from 'next';
import Link from 'next/link';
import { Gauge, MailPlus, UserPlus, Users, UsersRound } from 'lucide-react';
import { UserRoles } from '@agency-os/contracts';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_LEADERSHIP, ROLES_OWNER } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { StatCard } from '@/shared/ui/stat-card';
import { InviteDialog } from '@/features/team/components/invite-dialog';
import { MemberCard } from '@/features/team/components/member-card';
import type { Member } from '@/features/team/data/members.repository';
import { listMembers } from '@/features/team/services/members.service';
import { listTasks, openHoursByAssignee } from '@/features/tasks/services/tasks.service';

export const metadata: Metadata = { title: t('team.title') };

const BASE = '/team';
const FILTERS = ['all', 'leaders', 'creators', 'invited'] as const;
type TeamFilter = (typeof FILTERS)[number];

const GUIDE: GuideItem[] = [
  { title: t('team.guide.invite.title'), body: t('team.guide.invite.body') },
  { title: t('team.guide.roles.title'), body: t('team.guide.roles.body') },
  { title: t('team.guide.workload.title'), body: t('team.guide.workload.body') },
];

const PREDICATES: Record<TeamFilter, (member: Member) => boolean> = {
  all: () => true,
  leaders: (m) => m.status === 'ACTIVE' && (m.role === UserRoles.OWNER || m.role === UserRoles.MANAGER),
  creators: (m) => m.status === 'ACTIVE' && m.role === UserRoles.CREATOR,
  invited: (m) => m.status === 'INVITED',
};

function parseFilter(value: string | undefined): TeamFilter {
  return FILTERS.find((f) => f === value) ?? 'all';
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_LEADERSHIP);
  const sp = await searchParams;
  const filter = parseFilter(param(sp, 'f'));
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [members, tasks] = await Promise.all([listMembers(), listTasks()]);
  const hours = openHoursByAssignee(tasks);
  const scoped = members.filter((m) => !query || `${m.name} ${m.email} ${m.title} ${m.skills.join(' ')}`.toLowerCase().includes(query));
  const visible = scoped.filter(PREDICATES[filter]);

  const active = members.filter((m) => m.status === 'ACTIVE');
  const pending = members.filter(PREDICATES.invited).length;
  const totalCapacity = active.reduce((acc, m) => acc + m.capacityHours, 0);
  const totalOpen = active.reduce((acc, m) => acc + (hours.get(m.id) ?? 0), 0);
  const utilisation = totalCapacity > 0 ? Math.round((totalOpen / totalCapacity) * 100) : 0;

  const canManage = ROLES_OWNER.includes(session.role);
  const hasFilters = filter !== 'all' || Boolean(query);
  const filterLabels: Record<TeamFilter, string> = {
    all: t('team.filter.all'),
    leaders: t('team.filter.leaders'),
    creators: t('team.filter.creators'),
    invited: t('team.filter.invited'),
  };

  return (
    <div>
      <PageHeader
        title={t('team.title')}
        description={t('team.description')}
        eyebrow={<UsersRound className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <InviteDialog
              defaultOpen={param(sp, 'new') === '1'}
              trigger={
                <Button variant="primary">
                  <UserPlus />
                  {t('team.invite')}
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('team.stat.members')} value={String(active.length)} icon={<Users />} hint={t('team.stat.members.hint')} />
        <StatCard label={t('team.stat.pending')} value={String(pending)} icon={<MailPlus />} hint={t('team.stat.pending.hint')} />
        <StatCard label={t('team.stat.capacity')} value={t('team.hours', { hours: totalCapacity })} icon={<Gauge />} hint={t('team.stat.capacity.hint')} />
        <StatCard label={t('team.stat.utilisation')} value={`${utilisation}%`} icon={<Gauge />} hint={t('team.stat.utilisation.hint', { open: totalOpen })} />
      </div>

      <div role="search" aria-label={t('team.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('team.search')} className="max-w-64" />
        <FilterChips
          items={FILTERS.map((f) => ({
            href: withQuery(BASE, sp, { new: undefined, f: f === 'all' ? undefined : f }),
            label: filterLabels[f],
            active: filter === f,
            count: scoped.filter(PREDICATES[f]).length,
          }))}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<Users />}
            title={t('team.empty.title')}
            body={t('team.empty.body')}
            action={
              hasFilters ? (
                <Button variant="secondary" asChild>
                  <Link href={BASE}>{t('common.clearFilters')}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((member) => (
            <li key={member.id}>
              <MemberCard member={member} openHours={hours.get(member.id) ?? 0} isSelf={member.id === session.userId} canManage={canManage} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
