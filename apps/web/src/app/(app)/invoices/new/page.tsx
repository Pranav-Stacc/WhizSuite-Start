import type { Metadata } from 'next';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { daysFromNow, toDateKey } from '@/shared/lib/format';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { BackLink } from '@/shared/ui/back-link';
import { PageHeader } from '@/shared/ui/page-header';
import { listClients } from '@/features/clients/services/clients.service';
import { createInvoiceAction } from '@/features/invoices/actions/invoice.actions';
import { InvoiceForm } from '@/features/invoices/components/invoice-form';
import { DEFAULT_PAYMENT_TERMS_DAYS, DEFAULT_TAX_RATE } from '@/features/invoices/lifecycle';

export const metadata: Metadata = { title: t('invoices.new') };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(ROLES_LEADERSHIP);
  const sp = await searchParams;
  const clients = (await listClients()).filter((c) => c.status !== 'CHURNED');
  const requested = param(sp, 'client');
  const clientId = clients.some((c) => c.id === requested) ? (requested ?? '') : '';

  return (
    <div>
      <BackLink href="/invoices" label={t('invoices.back')} className="mb-3 -ml-2" />
      <PageHeader title={t('invoices.new')} description={t('invoices.new.desc')} />
      <InvoiceForm
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        defaults={{ clientId, dueDate: toDateKey(daysFromNow(DEFAULT_PAYMENT_TERMS_DAYS)), taxRate: DEFAULT_TAX_RATE, lines: [{ description: '', quantity: 1, unitPrice: 0 }] }}
        submit={createInvoiceAction}
        cancelHref="/invoices"
      />
    </div>
  );
}
