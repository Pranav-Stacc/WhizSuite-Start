import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { MobileDataCard, MobileDataHeader, MobileDataRow, ResponsiveDataView } from '@/shared/ui/responsive-data';
import { StatusBadge } from '@/shared/ui/status';
import type { InvoiceView } from '../services/invoices.service';

interface InvoiceTableProps {
  invoices: InvoiceView[];
  clientName: (clientId: string) => string | undefined;
}

export function InvoiceTable({ invoices, clientName }: InvoiceTableProps) {
  const table = (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">{t('invoices.col.number')}</th>
            <th className="px-4 py-3 font-medium">{t('invoices.col.client')}</th>
            <th className="px-4 py-3 font-medium">{t('invoices.col.status')}</th>
            <th className="px-4 py-3 font-medium">{t('invoices.col.issued')}</th>
            <th className="px-4 py-3 font-medium">{t('invoices.col.due')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('invoices.col.total')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="transition-colors hover:bg-surface-2">
              <td className="px-4 py-3">
                <Link href={`/invoices/${invoice.id}`} className="font-medium hover:text-primary">
                  {invoice.number}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{clientName(invoice.clientId)}</td>
              <td className="px-4 py-3">
                <StatusBadge kind="invoice" value={invoice.status} />
              </td>
              <td className="px-4 py-3 text-muted">{formatDate(invoice.issueDate)}</td>
              <td className="px-4 py-3 text-muted">{invoice.status === 'PAID' && invoice.paidAt ? t('invoices.paidOn', { date: formatDate(invoice.paidAt) }) : formatDate(invoice.dueDate)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(invoice.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cards = invoices.map((invoice) => (
    <MobileDataCard key={invoice.id} href={`/invoices/${invoice.id}`}>
      <MobileDataHeader
        title={invoice.number}
        subtitle={clientName(invoice.clientId)}
        trailing={<StatusBadge kind="invoice" value={invoice.status} />}
      />
      <MobileDataRow label={t('invoices.col.issued')}>{formatDate(invoice.issueDate)}</MobileDataRow>
      <MobileDataRow label={t('invoices.col.due')}>
        {invoice.status === 'PAID' && invoice.paidAt ? t('invoices.paidOn', { date: formatDate(invoice.paidAt) }) : formatDate(invoice.dueDate)}
      </MobileDataRow>
      <MobileDataRow label={t('invoices.col.total')}>
        <span className="font-semibold tabular-nums">{formatMoney(invoice.total)}</span>
      </MobileDataRow>
    </MobileDataCard>
  ));

  return <ResponsiveDataView table={table} cards={cards} />;
}
