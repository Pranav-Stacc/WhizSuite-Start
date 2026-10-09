import { type InvoiceStatus, InvoiceStatuses, Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileText, Hourglass, Plus, Receipt } from 'lucide-react';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { StatCard } from '@/shared/ui/stat-card';
import { statusLabel } from '@/shared/ui/status';
import { clientsById } from '@/features/clients/services/clients.service';
import { InvoiceTable } from '@/features/invoices/components/invoice-table';
import { listInvoices, summarize } from '@/features/invoices/services/invoices.service';

export const metadata: Metadata = { title: t('invoices.title') };

const BASE = '/invoices';
const NEW_PATH = '/invoices/new';
const STATUS_FILTERS = ['all', ...InvoiceStatuses] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const GUIDE: GuideItem[] = [
  { title: t('invoices.guide.create.title'), body: t('invoices.guide.create.body') },
  { title: t('invoices.guide.send.title'), body: t('invoices.guide.send.body') },
  { title: t('invoices.guide.paid.title'), body: t('invoices.guide.paid.body') },
  { title: t('invoices.guide.overdue.title'), body: t('invoices.guide.overdue.body') },
];

function parseStatus(value: string | undefined): StatusFilter {
  return STATUS_FILTERS.find((s) => s === value) ?? 'all';
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission(Permissions.INVOICES_VIEW);
  const sp = await searchParams;
  if (param(sp, 'new') === '1') redirect(withQuery(NEW_PATH, sp, { new: undefined }));

  const status = parseStatus(param(sp, 'status'));
  const clientId = param(sp, 'client');
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [all, clients] = await Promise.all([listInvoices(), clientsById()]);
  const receivables = summarize(all);
  const scoped = all.filter((invoice) => {
    if (clientId && invoice.clientId !== clientId) return false;
    if (query && !`${invoice.number} ${clients.get(invoice.clientId)?.name ?? ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const matches = (invoice: { status: InvoiceStatus }, filter: StatusFilter) => filter === 'all' || invoice.status === filter;
  const invoices = scoped.filter((invoice) => matches(invoice, status));
  const link = (filter: StatusFilter) => withQuery(BASE, sp, { status: filter === 'all' ? undefined : filter });

  return (
    <div>
      <PageHeader
        title={t('invoices.title')}
        description={t('invoices.description')}
        eyebrow={<Receipt className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <Button variant="primary" asChild>
              <Link href={clientId ? `${NEW_PATH}?client=${clientId}` : NEW_PATH}>
                <Plus />
                {t('invoices.new')}
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('invoices.kpi.outstanding')} value={formatMoney(receivables.outstanding, undefined, true)} icon={<Hourglass />} hint={t('invoices.kpi.outstanding.hint')} />
        <StatCard label={t('invoices.kpi.overdue')} value={formatMoney(receivables.overdue, undefined, true)} icon={<AlertTriangle />} hint={t('invoices.kpi.overdue.hint')} />
        <StatCard label={t('invoices.kpi.paid')} value={formatMoney(receivables.paidThisMonth, undefined, true)} icon={<CheckCircle2 />} hint={t('invoices.kpi.paid.hint')} />
        <StatCard label={t('invoices.kpi.draft')} value={formatMoney(receivables.draft, undefined, true)} icon={<FileText />} hint={t('invoices.kpi.draft.hint')} />
      </div>

      <div role="search" aria-label={t('invoices.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('invoices.search')} className="max-w-64" />
        <FilterChips
          items={STATUS_FILTERS.map((f) => ({
            href: link(f),
            label: f === 'all' ? t('invoices.filter.all') : statusLabel('invoice', f),
            active: status === f,
            count: scoped.filter((invoice) => matches(invoice, f)).length,
          }))}
        />
        <FilterSelect
          name="client"
          value={clientId}
          label={t('invoices.filter.client')}
          allLabel={t('invoices.filter.client')}
          options={[...clients.values()].map((c) => ({ value: c.id, label: c.name }))}
          className="ml-auto"
        />
      </div>

      {invoices.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<Receipt />}
            title={t('invoices.empty.title')}
            body={t('invoices.empty.body')}
            action={
              <Button variant="secondary" asChild>
                <Link href={status !== 'all' || clientId || query ? BASE : NEW_PATH}>{status !== 'all' || clientId || query ? t('common.clearFilters') : t('invoices.new')}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <InvoiceTable invoices={invoices} clientName={(id) => clients.get(id)?.name} />
      )}
    </div>
  );
}
