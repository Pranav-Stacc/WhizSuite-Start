import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { fromMinorUnits, toDateKey } from '@/shared/lib/format';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { BackLink } from '@/shared/ui/back-link';
import { PageHeader } from '@/shared/ui/page-header';
import { listClients } from '@/features/clients/services/clients.service';
import { updateInvoiceAction } from '@/features/invoices/actions/invoice.actions';
import { InvoiceForm } from '@/features/invoices/components/invoice-form';
import { isDraft } from '@/features/invoices/lifecycle';
import { getInvoice } from '@/features/invoices/services/invoices.service';

export const metadata: Metadata = { title: t('invoices.edit') };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ROLES_LEADERSHIP);
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  if (!isDraft(invoice.status)) redirect(`/invoices/${id}`);
  const clients = (await listClients()).filter((c) => c.status !== 'CHURNED' || c.id === invoice.clientId);

  return (
    <div>
      <BackLink href={`/invoices/${id}`} label={invoice.number} className="mb-3 -ml-2" />
      <PageHeader title={t('invoices.edit')} description={invoice.number} />
      <InvoiceForm
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        defaults={{
          clientId: invoice.clientId,
          dueDate: toDateKey(invoice.dueDate),
          taxRate: invoice.taxRate,
          lines: invoice.lines.map((line) => ({ description: line.description, quantity: line.quantity, unitPrice: fromMinorUnits(line.unitMinor) })),
        }}
        submit={updateInvoiceAction.bind(null, id)}
        cancelHref={`/invoices/${id}`}
      />
    </div>
  );
}
