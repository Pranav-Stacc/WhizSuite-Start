import type { InvoiceStatus } from '@agency-os/contracts';

/** Only drafts may be edited or deleted; once sent, an invoice is a financial record. */
export function isDraft(status: InvoiceStatus): boolean {
  return status === 'DRAFT';
}

export const INVOICE_NUMBER_PREFIX = 'INV';
export const INVOICE_NUMBER_PAD = 4;
export const DEFAULT_TAX_RATE = 18;
export const DEFAULT_PAYMENT_TERMS_DAYS = 15;
