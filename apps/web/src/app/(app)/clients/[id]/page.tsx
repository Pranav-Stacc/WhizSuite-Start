import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ClientStatuses } from '@agency-os/contracts';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { ROLES_LEADERSHIP, ROLES_STAFF } from '@/shared/navigation/nav-config';
import { LogoTile } from '@/shared/ui/avatar';
import { TabLinks, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { StatusMenu } from '@/shared/ui/status-menu';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { setClientStatusAction } from '@/features/clients/actions/client.actions';
import { BillingTab, BrandTab, OverviewTab, WorkTab } from '@/features/clients/components/client-sections';
import { HealthPill } from '@/features/clients/components/health-pill';
import { getClient } from '@/features/clients/services/clients.service';
import { listContent } from '@/features/content/services/content.service';
import { listIntegrations } from '@/features/integrations/services/integrations.service';
import { listInvoices } from '@/features/invoices/services/invoices.service';
import { listProjectsWithProgress } from '@/features/projects/services/projects.service';
import { membersById } from '@/features/team/services/members.service';

const TABS = ['overview', 'brand', 'work', 'billing'] as const;
type Tab = (typeof TABS)[number];
const RECENT_CONTENT_LIMIT = 6;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

const GUIDE: GuideItem[] = [{ title: t('clients.guide.detail.title'), body: t('clients.guide.detail.body') }];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const client = await getClient((await params).id);
  return { title: client?.name ?? t('clients.notFound') };
}

export default async function ClientDetailPage({ params, searchParams }: PageProps) {
  const session = await requireRole(ROLES_STAFF);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const client = await getClient(id);
  if (!client) notFound();

  const tab: Tab = TABS.find((x) => x === param(sp, 'tab')) ?? 'overview';
  const canManage = ROLES_LEADERSHIP.includes(session.role);
  const base = `/clients/${client.id}`;

  const [members, integrations, projects, content, invoices] = await Promise.all([
    membersById(),
    listIntegrations(),
    listProjectsWithProgress(),
    listContent(),
    listInvoices(),
  ]);
  const clientProjects = projects.filter((p) => p.clientId === client.id);
  const clientPosts = content.filter((c) => c.clientId === client.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, RECENT_CONTENT_LIMIT);
  const clientInvoices = invoices.filter((i) => i.clientId === client.id);

  const tabLabels: Record<Tab, string> = {
    overview: t('clients.tab.overview'),
    brand: t('clients.tab.brand'),
    work: t('clients.tab.work'),
    billing: t('clients.tab.billing'),
  };

  return (
    <div>
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t('clients.back')}
      </Link>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <LogoTile name={client.name} color={client.color} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{client.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{client.industry}</span>
              <HealthPill score={client.health} showLabel />
              <span className="tabular-nums">
                {formatMoney(client.retainerMinor)} <span className="text-xs">{t('clients.col.retainer')}</span>
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageGuide items={GUIDE} />
          {canManage ? (
            <StatusMenu
              current={client.status}
              label={t('clients.status.change')}
              options={ClientStatuses.map((s) => ({ value: s, label: statusLabel('client', s), color: TONE_COLOR[statusTone('client', s)] }))}
              action={setClientStatusAction.bind(null, client.id)}
            />
          ) : null}
        </div>
      </header>

      <div role="navigation" aria-label={t('clients.tabs.label')}>
        <TabLinks items={TABS.map((x) => ({ href: withQuery(base, sp, { tab: x === 'overview' ? undefined : x }), label: tabLabels[x], active: tab === x }))} />
      </div>

      {tab === 'overview' ? <OverviewTab client={client} ownerName={members.get(client.ownerId)?.name} integrations={integrations.filter((i) => i.clientId === client.id)} /> : null}
      {tab === 'brand' ? <BrandTab client={client} canEdit={canManage} /> : null}
      {tab === 'work' ? <WorkTab clientId={client.id} projects={clientProjects} posts={clientPosts} /> : null}
      {tab === 'billing' ? <BillingTab clientId={client.id} invoices={clientInvoices} /> : null}
    </div>
  );
}
