import type { Metadata } from 'next';
import Link from 'next/link';
import { Plug, Radio, Users } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatNumber } from '@/shared/lib/format';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { StatCard } from '@/shared/ui/stat-card';
import { listClients } from '@/features/clients/services/clients.service';
import { ChannelRow } from '@/features/integrations/components/channel-row';
import { listIntegrations } from '@/features/integrations/services/integrations.service';

export const metadata: Metadata = { title: t('integrations.title') };

const BASE = '/integrations';
const FILTERS = ['all', 'connected', 'available'] as const;
type ChannelFilter = (typeof FILTERS)[number];

const GUIDE: GuideItem[] = [
  { title: t('integrations.guide.connect.title'), body: t('integrations.guide.connect.body') },
  { title: t('integrations.guide.sync.title'), body: t('integrations.guide.sync.body') },
  { title: t('integrations.guide.disconnect.title'), body: t('integrations.guide.disconnect.body') },
];

function parseFilter(value: string | undefined): ChannelFilter {
  return FILTERS.find((f) => f === value) ?? 'all';
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(ROLES_LEADERSHIP);
  const sp = await searchParams;
  const filter = parseFilter(param(sp, 'f'));
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [clients, integrations] = await Promise.all([listClients(), listIntegrations()]);
  const connected = integrations.filter((i) => i.connected);
  const followers = connected.reduce((total, i) => total + i.followers, 0);

  const visible = integrations.filter((i) => filter === 'all' || (filter === 'connected') === i.connected);
  const sections = clients
    .filter((client) => !query || client.name.toLowerCase().includes(query))
    .map((client) => ({ client, rows: visible.filter((i) => i.clientId === client.id) }))
    .filter((section) => section.rows.length > 0);

  const link = (f: ChannelFilter) => withQuery(BASE, sp, { f: f === 'all' ? undefined : f });
  const filterLabels: Record<ChannelFilter, string> = { all: t('integrations.filter.all'), connected: t('integrations.filter.connected'), available: t('integrations.filter.available') };
  const countFor = (f: ChannelFilter) => integrations.filter((i) => f === 'all' || (f === 'connected') === i.connected).length;

  return (
    <div>
      <PageHeader title={t('integrations.title')} description={t('integrations.description')} eyebrow={<Plug className="inline size-3.5" />} actions={<PageGuide items={GUIDE} />} />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t('integrations.kpi.connected')} value={connected.length} icon={<Plug />} hint={t('integrations.kpi.connected.hint', { total: integrations.length })} />
        <StatCard label={t('integrations.kpi.followers')} value={formatNumber(followers, true)} icon={<Users />} hint={t('integrations.kpi.followers.hint')} />
        <StatCard label={t('integrations.kpi.clients')} value={new Set(connected.map((i) => i.clientId)).size} icon={<Radio />} hint={t('integrations.kpi.clients.hint', { total: clients.length })} />
      </div>

      <div role="search" aria-label={t('integrations.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('integrations.search')} className="max-w-64" />
        <FilterChips items={FILTERS.map((f) => ({ href: link(f), label: filterLabels[f], active: filter === f, count: countFor(f) }))} />
      </div>

      {sections.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<Plug />}
            title={t('integrations.empty.title')}
            body={t('integrations.empty.body')}
            action={
              filter !== 'all' || query ? (
                <Button variant="secondary" asChild>
                  <Link href={BASE}>{t('common.clearFilters')}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map(({ client, rows }) => (
            <Card key={client.id}>
              <CardHeader
                title={client.name}
                description={t('integrations.client.summary', { connected: rows.filter((r) => r.connected).length, total: rows.length })}
                action={
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/clients/${client.id}`}>{t('common.view')}</Link>
                  </Button>
                }
              />
              <CardBody className="pt-2">
                <ul className="divide-y divide-border-soft">
                  {rows.map((integration) => (
                    <ChannelRow key={integration.id} integration={integration} clientName={client.name} />
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
