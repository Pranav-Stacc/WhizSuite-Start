import { t } from '@/shared/i18n/t';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/status';
import type { InvoiceView } from '../services/invoices.service';

interface InvoiceDocumentProps {
  invoice: InvoiceView;
  issuerName: string;
  client: { name: string; contactName?: string; contactEmail?: string };
}

/** The invoice as the client sees it — used on the staff detail page and in the client portal. */
export function InvoiceDocument({ invoice, issuerName, client }: InvoiceDocumentProps) {
  return (
    <article aria-label={invoice.number} className="card-surface print-sheet p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border-soft pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{t('invoices.doc.title')}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{invoice.number}</h2>
        </div>
        <StatusBadge kind="invoice" value={invoice.status} />
      </header>

      <dl className="grid gap-6 py-6 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">{t('invoices.doc.from')}</dt>
          <dd className="mt-1 text-sm font-medium">{issuerName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">{t('invoices.doc.billTo')}</dt>
          <dd className="mt-1 text-sm font-medium">{client.name}</dd>
          {client.contactName ? <dd className="text-sm text-muted">{client.contactName}</dd> : null}
          {client.contactEmail ? <dd className="text-sm text-muted">{client.contactEmail}</dd> : null}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-3 sm:justify-start sm:gap-6">
            <dt className="text-muted">{t('invoices.doc.issued')}</dt>
            <dd className="font-medium">{formatDate(invoice.issueDate, { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start sm:gap-6">
            <dt className="text-muted">{t('invoices.doc.due')}</dt>
            <dd className="font-medium">{formatDate(invoice.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
          </div>
          {invoice.paidAt ? (
            <div className="flex justify-between gap-3 sm:justify-start sm:gap-6">
              <dt className="text-muted">{t('invoices.doc.paid')}</dt>
              <dd className="font-medium">{formatDate(invoice.paidAt, { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
            </div>
          ) : null}
        </div>
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-y border-border-soft text-xs uppercase tracking-wide text-muted">
              <th className="py-2.5 pr-3 font-medium">{t('invoices.line.description')}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t('invoices.line.quantity')}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t('invoices.line.unitPrice')}</th>
              <th className="py-2.5 pl-3 text-right font-medium">{t('invoices.line.amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {invoice.lines.map((line, index) => (
              <tr key={`${line.description}-${index}`}>
                <td className="py-3 pr-3">{line.description}</td>
                <td className="px-3 py-3 text-right tabular-nums">{line.quantity}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMoney(line.unitMinor)}</td>
                <td className="py-3 pl-3 text-right font-medium tabular-nums">{formatMoney(line.quantity * line.unitMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{t('invoices.subtotal')}</dt>
          <dd className="tabular-nums">{formatMoney(invoice.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{t('invoices.tax', { rate: invoice.taxRate })}</dt>
          <dd className="tabular-nums">{formatMoney(invoice.tax)}</dd>
        </div>
        <div className="flex justify-between border-t border-border-soft pt-3 text-lg font-semibold">
          <dt>{t('invoices.total')}</dt>
          <dd className="tabular-nums text-primary">{formatMoney(invoice.total)}</dd>
        </div>
      </dl>
    </article>
  );
}
