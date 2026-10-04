import type { Metadata } from 'next';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Card, CardBody } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { PageHeader } from '@/shared/ui/page-header';
import { statusLabel, statusTone } from '@/shared/ui/status';
import { portalInvoices } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.invoices.title') };

export default async function PortalInvoicesPage() {
  const session = await requireSession();
  const invoices = await portalInvoices(session.clientId!);

  return (
    <div>
      <PageHeader title={t('portal.invoices.title')} description={t('portal.invoices.description')} eyebrow={<Receipt className="inline size-3.5" />} />
      {invoices.length === 0 ? (
        <Card>
          <EmptyState icon={<Receipt />} title={t('portal.invoices.empty.title')} body={t('portal.invoices.empty.body')} />
        </Card>
      ) : (
        <ul className="space-y-3">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link href={`/portal/invoices/${invoice.id}`} className="card-surface block p-5 transition-colors hover:border-primary/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{invoice.number}</p>
                    <p className="text-xs text-muted">{t('portal.invoices.due', { date: formatDate(invoice.dueDate) })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums text-primary">{formatMoney(invoice.total)}</p>
                    <Badge tone={statusTone('invoice', invoice.status)}>{statusLabel('invoice', invoice.status)}</Badge>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
