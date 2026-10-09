import { notFound } from 'next/navigation';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { SectionHeading } from '@/shared/ui/section-heading';
import { BillingTab } from '@/features/clients/components/client-sections';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { listInvoices } from '@/features/invoices/services/invoices.service';

export const metadata = { title: t('clients.workspace.invoices') };

export default async function ClientInvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ROLES_STAFF);
  const client = await getClient((await params).id);
  if (!client) notFound();
  const invoices = (await listInvoices()).filter((invoice) => invoice.clientId === client.id);

  return (
    <section>
      <SectionHeading number={clientSectionNumber('invoices')} title={t('clients.workspace.invoices')} />
      <BillingTab clientId={client.id} invoices={invoices} />
    </section>
  );
}
