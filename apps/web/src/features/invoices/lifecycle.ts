import type { InvoiceStatus } from '@agency-os/contracts';

/** Allowed invoice status moves; anything else is rejected by the server and hidden in the UI. */
export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['SENT', 'VOID'],
  SENT: ['PAID', 'VOID'],
  OVERDUE: ['PAID', 'VOID'],
  PAID: [],
  VOID: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from].includes(to);
}

/** Only drafts may be edited or deleted; once sent, an invoice is a financial record. */
export function isDraft(status: InvoiceStatus): boolean {
  return status === 'DRAFT';
}

export const INVOICE_NUMBER_PREFIX = 'INV';
export const INVOICE_NUMBER_PAD = 4;
export const DEFAULT_TAX_RATE = 18;
export const DEFAULT_PAYMENT_TERMS_DAYS = 15;
