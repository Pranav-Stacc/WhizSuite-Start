import type { InvoiceStatus } from '../domain/statuses.js';

/** Allowed invoice status moves; the API rejects anything else and the UI hides it. */
export const INVOICE_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ['SENT', 'VOID'],
  SENT: ['PAID', 'VOID'],
  OVERDUE: ['PAID', 'VOID'],
  PAID: [],
  VOID: [],
};

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from].includes(to);
}

/** Statuses an invoice may be created in (a draft, or sent straight away). */
export const InvoiceCreatableStatuses = ['DRAFT', 'SENT'] as const;
export type InvoiceCreatableStatus = (typeof InvoiceCreatableStatuses)[number];

export const INVOICE_LIST_LIMIT_DEFAULT = 200;
export const INVOICE_LINES_MAX_DEFAULT = 100;
export const INVOICE_NUMBER_MAX_LENGTH = 40;
export const INVOICE_LINE_DESCRIPTION_MAX_LENGTH = 500;
export const INVOICE_LINE_QUANTITY_MAX = 100_000;
export const INVOICE_TAX_RATE_MAX = 100;
export const BASIS_POINTS_PER_PERCENT = 100;

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  /** Unit price in minor currency units. */
  unitMinor: number;
}

export interface InvoiceCreateInput {
  clientId: string;
  number: string;
  status?: InvoiceCreatableStatus;
  /** ISO date (YYYY-MM-DD or full ISO timestamp). */
  dueDate: string;
  /** Tax rate as a percentage, e.g. 18 for 18%. */
  taxRate: number;
  lines: InvoiceLineInput[];
}

export interface InvoiceUpdateInput {
  clientId?: string;
  dueDate?: string;
  taxRate?: number;
  lines?: InvoiceLineInput[];
  status?: InvoiceStatus;
}

export interface InvoiceLineDto extends InvoiceLineInput {
  id: string;
}

export interface InvoiceDto {
  id: string;
  clientId: string;
  number: string;
  status: InvoiceStatus;
  currency: string;
  taxRate: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  issueDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  lines: InvoiceLineDto[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/** Single source of invoice arithmetic, in minor units; tax is rounded once on the subtotal. */
export function computeInvoiceTotals(lines: readonly InvoiceLineInput[], taxRate: number): InvoiceTotals {
  const subtotal = lines.reduce((acc, line) => acc + line.quantity * line.unitMinor, 0);
  const tax = Math.round((subtotal * taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}
