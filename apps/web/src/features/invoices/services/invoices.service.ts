import 'server-only';
import type { InvoiceStatus } from '@agency-os/contracts';
import { INVOICE_NUMBER_PAD, INVOICE_NUMBER_PREFIX } from '../lifecycle';
import { invoiceTotals, invoicesRepository, type Invoice } from '../data/invoices.repository';

export interface InvoiceView extends Invoice {
  total: number;
  subtotal: number;
  tax: number;
}

/** A sent invoice past its due date is overdue even if nobody flipped the status yet. */
export function effectiveStatus(invoice: Pick<Invoice, 'status' | 'dueDate'>, now: number = Date.now()): InvoiceStatus {
  return invoice.status === 'SENT' && new Date(invoice.dueDate).getTime() < now ? 'OVERDUE' : invoice.status;
}

export function toView(invoice: Invoice): InvoiceView {
  const totals = invoiceTotals(invoice);
  return { ...invoice, status: effectiveStatus(invoice), ...totals };
}

export async function listInvoices(): Promise<InvoiceView[]> {
  const rows = await invoicesRepository.list();
  return rows.map(toView).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export async function getInvoice(id: string): Promise<InvoiceView | undefined> {
  const row = await invoicesRepository.get(id);
  return row ? toView(row) : undefined;
}

/** Next sequential number for the current year, e.g. INV-2026-0008. */
export async function nextInvoiceNumber(now: Date = new Date()): Promise<string> {
  const prefix = `${INVOICE_NUMBER_PREFIX}-${now.getFullYear()}-`;
  const rows = await invoicesRepository.list();
  const highest = rows.reduce((max, row) => {
    if (!row.number.startsWith(prefix)) return max;
    const sequence = Number.parseInt(row.number.slice(prefix.length), 10);
    return Number.isNaN(sequence) ? max : Math.max(max, sequence);
  }, 0);
  return `${prefix}${String(highest + 1).padStart(INVOICE_NUMBER_PAD, '0')}`;
}

export interface Receivables {
  outstanding: number;
  overdue: number;
  paidThisMonth: number;
  draft: number;
}

export function summarize(invoices: InvoiceView[], now: Date = new Date()): Receivables {
  const month = now.getMonth();
  const year = now.getFullYear();
  const summary: Receivables = { outstanding: 0, overdue: 0, paidThisMonth: 0, draft: 0 };
  for (const inv of invoices) {
    if (inv.status === 'SENT') summary.outstanding += inv.total;
    if (inv.status === 'OVERDUE') {
      summary.outstanding += inv.total;
      summary.overdue += inv.total;
    }
    if (inv.status === 'DRAFT') summary.draft += inv.total;
    if (inv.status === 'PAID' && inv.paidAt) {
      const paid = new Date(inv.paidAt);
      if (paid.getMonth() === month && paid.getFullYear() === year) summary.paidThisMonth += inv.total;
    }
  }
  return summary;
}
