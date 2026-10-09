import 'server-only';
import { computeInvoiceTotals, type InvoiceStatus, type InvoiceTotals } from '@agency-os/contracts';
import { invoicesLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitMinor: number;
}

export interface Invoice extends Entity {
  number: string;
  clientId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  taxRate: number;
  lines: InvoiceLine[];
}

const rupees = (value: number): number => value * 100;

const retainer = (clientId: string, desc: string, amount: number): InvoiceLine[] => [{ description: desc, quantity: 1, unitMinor: rupees(amount) }];

export const invoicesRepository = createRepository<Invoice>('invoices', () => [
  { id: 'inv1', number: 'INV-2026-0001', clientId: 'cl-lumen', status: 'PAID', issueDate: daysFromNow(-62), dueDate: daysFromNow(-47), paidAt: daysFromNow(-50), taxRate: 18, lines: retainer('cl-lumen', 'Social retainer — August', 85000) },
  { id: 'inv2', number: 'INV-2026-0002', clientId: 'cl-orbit', status: 'PAID', issueDate: daysFromNow(-33), dueDate: daysFromNow(-18), paidAt: daysFromNow(-20), taxRate: 18, lines: retainer('cl-orbit', 'Social retainer — September', 120000) },
  { id: 'inv3', number: 'INV-2026-0003', clientId: 'cl-nimbus', status: 'SENT', issueDate: daysFromNow(-3), dueDate: daysFromNow(12), taxRate: 18, lines: [...retainer('cl-nimbus', 'Social retainer — October', 150000), { description: 'Nimbus 3.0 launch video cutdowns', quantity: 4, unitMinor: rupees(25000) }] },
  { id: 'inv4', number: 'INV-2026-0004', clientId: 'cl-verde', status: 'OVERDUE', issueDate: daysFromNow(-35), dueDate: daysFromNow(-5), taxRate: 18, lines: retainer('cl-verde', 'Social retainer — September', 95000) },
  { id: 'inv5', number: 'INV-2026-0005', clientId: 'cl-lumen', status: 'SENT', issueDate: daysFromNow(-4), dueDate: daysFromNow(11), taxRate: 18, lines: [...retainer('cl-lumen', 'Social retainer — October', 85000), { description: 'Winter blend launch campaign', quantity: 1, unitMinor: rupees(120000) }] },
  { id: 'inv6', number: 'INV-2026-0006', clientId: 'cl-orbit', status: 'DRAFT', issueDate: daysFromNow(0), dueDate: daysFromNow(15), taxRate: 18, lines: retainer('cl-orbit', 'Social retainer — October', 120000) },
  { id: 'inv7', number: 'INV-2026-0007', clientId: 'cl-urban', status: 'PAID', issueDate: daysFromNow(-10), dueDate: daysFromNow(5), paidAt: daysFromNow(-6), taxRate: 18, lines: retainer('cl-urban', 'Onboarding & brand audit', 60000) },
], invoicesLive);

export function invoiceTotals(invoice: Pick<Invoice, 'lines' | 'taxRate'>): InvoiceTotals {
  return computeInvoiceTotals(invoice.lines, invoice.taxRate);
}
