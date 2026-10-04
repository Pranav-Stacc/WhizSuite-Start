'use server';

import { InvoiceStatuses, createInvoiceSchema, type CreateInvoiceInput, type InvoiceStatus } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { dateKeyToIso, toMinorUnits } from '@/shared/lib/format';
import { recordAudit } from '@/features/audit/services/audit.service';
import { getClient } from '@/features/clients/services/clients.service';
import { invoicesRepository } from '../data/invoices.repository';
import { canTransition, isDraft } from '../lifecycle';
import { nextInvoiceNumber } from '../services/invoices.service';

async function authorize() {
  const session = await requireSession();
  if (!ROLES_LEADERSHIP.includes(session.role)) throw new Error('forbidden');
  return session;
}

function toInvoiceFields(input: CreateInvoiceInput) {
  return {
    clientId: input.clientId,
    dueDate: dateKeyToIso(input.dueDate),
    taxRate: input.taxRate,
    lines: input.lines.map((line) => ({ description: line.description, quantity: line.quantity, unitMinor: toMinorUnits(line.unitPrice) })),
  };
}

/** Creates a draft, or sends it straight away when `send` is true. Returns the invoice page to open. */
export async function createInvoiceAction(raw: unknown, send: boolean): Promise<ActionResult<{ href: string }>> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(createInvoiceSchema, raw);
    if (!parsed.ok) return parsed.result;
    if (!(await getClient(parsed.data.clientId))) return fail(t('toast.failed'), { clientId: 'validation.required' });

    const invoice = await invoicesRepository.create({
      ...toInvoiceFields(parsed.data),
      number: await nextInvoiceNumber(),
      status: send ? 'SENT' : 'DRAFT',
      issueDate: new Date().toISOString(),
    });
    await recordAudit({ action: 'invoice.created', entityType: 'invoice', entityId: invoice.id, entityLabel: invoice.number, summary: 'Created invoice' });
    if (send) await recordAudit({ action: 'invoice.sent', entityType: 'invoice', entityId: invoice.id, entityLabel: invoice.number, summary: 'Sent invoice', diff: { status: { from: 'DRAFT', to: 'SENT' } } });
    await refreshData('invoices', 'clients');
    return succeed({ href: `/invoices/${invoice.id}` }, send ? t('invoices.sent', { number: invoice.number }) : t('invoices.created'));
  });
}

export async function updateInvoiceAction(id: string, raw: unknown, send: boolean): Promise<ActionResult<{ href: string }>> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(createInvoiceSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = await invoicesRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (!isDraft(before.status)) return fail(t('invoices.locked'));
    if (!(await getClient(parsed.data.clientId))) return fail(t('toast.failed'), { clientId: 'validation.required' });

    await invoicesRepository.update(id, { ...toInvoiceFields(parsed.data), ...(send ? { status: 'SENT' as const, issueDate: new Date().toISOString() } : {}) });
    await recordAudit({ action: 'invoice.updated', entityType: 'invoice', entityId: id, entityLabel: before.number, summary: 'Updated invoice' });
    if (send) await recordAudit({ action: 'invoice.sent', entityType: 'invoice', entityId: id, entityLabel: before.number, summary: 'Sent invoice', diff: { status: { from: 'DRAFT', to: 'SENT' } } });
    await refreshData('invoices', 'clients');
    return succeed({ href: `/invoices/${id}` }, send ? t('invoices.sent', { number: before.number }) : t('invoices.updated'));
  });
}

export async function setInvoiceStatusAction(id: string, status: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    if (!InvoiceStatuses.includes(status as InvoiceStatus)) return fail(t('toast.failed'));
    const target = status as InvoiceStatus;
    const before = await invoicesRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    const from: InvoiceStatus = before.status;
    if (!canTransition(from, target)) return fail(t('invoices.transition.invalid'));

    await invoicesRepository.update(id, { status: target, paidAt: target === 'PAID' ? new Date().toISOString() : before.paidAt });
    await recordAudit({
      action: `invoice.${target.toLowerCase()}`,
      entityType: 'invoice',
      entityId: id,
      entityLabel: before.number,
      summary: t(`invoices.audit.${target}`),
      diff: { status: { from, to: target } },
    });
    await refreshData('invoices', 'clients');
    return succeed(undefined, t(`invoices.status.updated.${target}`));
  });
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await invoicesRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (!isDraft(before.status)) return fail(t('invoices.locked'));
    await invoicesRepository.remove(id);
    await recordAudit({ action: 'invoice.deleted', entityType: 'invoice', entityId: id, entityLabel: before.number, summary: 'Deleted draft invoice' });
    await refreshData('invoices', 'clients');
    return succeed(undefined, t('invoices.deleted'));
  });
}
