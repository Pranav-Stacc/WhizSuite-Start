import { ClientStatuses, Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { AlertTriangle, LayoutGrid, Plus, Rows3, Users, Wallet } from 'lucide-react';
import { can, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterChips, ViewToggle, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { StatCard, StatGrid } from '@/shared/ui/stat-card';
import { statusLabel } from '@/shared/ui/status';
import { healthBand } from '@/features/clients/config';
import { ClientCard } from '@/features/clients/components/client-card';
import { ClientDialog } from '@/features/clients/components/client-dialogs';
import { ClientTable } from '@/features/clients/components/client-table';
import { listClients, monthlyRecurring } from '@/features/clients/services/clients.service';
import { membersById } from '@/features/team/services/members.service';

export const metadata: Metadata = { title: t('clients.title') };

const BASE = '/clients';

const GUIDE: GuideItem[] = [
  { title: t('clients.guide.cards.title'), body: t('clients.guide.cards.body') },
  { title: t('clients.guide.add.title'), body: t('clients.guide.add.body') },
];

export default async function ClientsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission(Permissions.CLIENTS_VIEW);
  const sp = await searchParams;
  const canManage = await can(Permissions.CLIENTS_CREATE);
  const view = param(sp, 'view') === 'table' ? 'table' : 'cards';
  const status = ClientStatuses.find((s) => s === param(sp, 'status'));
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [clients, members] = await Promise.all([listClients(), membersById()]);
  const scoped = clients.filter((c) => !query || c.name.toLowerCase().includes(query) || c.industry.toLowerCase().includes(query));
  const visible = scoped.filter((c) => !status || c.status === status);
  const payingCount = clients.filter((c) => c.retainerMinor > 0 && (c.status === 'ACTIVE' || c.status === 'ONBOARDING')).length;
  const atRisk = clients.filter((c) => c.status !== 'CHURNED' && healthBand(c.health) === 'risk').length;
  const channels = clients.reduce((total, c) => total + c.platforms.length, 0);
  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, ...overrides });

  const addButton = (
    <Button variant="primary" data-tour="setup-client">
      <Plus />
      {t('clients.new')}
    </Button>
  );

  return (
    <div>
      <PageHeader
        title={t('clients.title')}
        description={t('clients.description')}
        eyebrow={<Users className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <ViewToggle
              items={[
                { href: link({ view: undefined }), label: t('clients.view.cards'), active: view === 'cards', icon: <LayoutGrid /> },
                { href: link({ view: 'table' }), label: t('clients.view.table'), active: view === 'table', icon: <Rows3 /> },
              ]}
            />
            {canManage ? <ClientDialog defaultOpen={param(sp, 'new') === '1'} trigger={addButton} /> : null}
          </>
        }
      />

      <StatGrid cols={3}>
        <StatCard label={t('clients.mrr')} value={<span>{formatMoney(monthlyRecurring(clients), undefined, true)}</span>} icon={<Wallet />} hint={t('clients.mrr.hint', { count: payingCount })} />
        <StatCard label={t('clients.stat.risk')} value={<span>{atRisk}</span>} icon={<AlertTriangle />} hint={t('clients.health.risk')} />
        <StatCard label={t('clients.stat.channels')} value={<span>{channels}</span>} icon={<Users />} />
      </StatGrid>

      <div role="search" aria-label={t('clients.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('clients.search')} className="max-w-64" />
        <FilterChips
          items={[
            { href: link({ status: undefined }), label: t('clients.filter.all'), active: !status, count: scoped.length },
            ...ClientStatuses.map((s) => ({ href: link({ status: s }), label: statusLabel('client', s), active: status === s, count: scoped.filter((c) => c.status === s).length })),
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card-surface">
          <EmptyState icon={<Users />} title={t('clients.empty.title')} body={t('clients.empty.body')} action={canManage ? <ClientDialog trigger={addButton} /> : undefined} />
        </div>
      ) : view === 'table' ? (
        <ClientTable clients={visible} ownerName={(id) => members.get(id)?.name} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((client) => (
            <li key={client.id}>
              <ClientCard client={client} ownerName={members.get(client.ownerId)?.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
