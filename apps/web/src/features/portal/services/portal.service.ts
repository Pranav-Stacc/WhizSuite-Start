import 'server-only';
import type { InvoiceStatus } from '@agency-os/contracts';
import { listContent } from '@/features/content/services/content.service';
import { getClient } from '@/features/clients/services/clients.service';
import { listAssets } from '@/features/media/services/media.service';
import { listInvoices, effectiveStatus } from '@/features/invoices/services/invoices.service';
import { loadReport } from '@/features/reports/services/reports.service';
import { threadRepository } from '../data/thread.repository';

const PORTAL_INVOICE_STATUSES: InvoiceStatus[] = ['SENT', 'PAID', 'OVERDUE'];

export async function portalClient(clientId: string) {
  return getClient(clientId);
}

/** Everything the client may see in the review desk: drafts stay internal to the agency. */
export async function portalContent(clientId: string) {
  const posts = await listContent();
  return posts.filter((p) => p.clientId === clientId && p.status !== 'DRAFT');
}

export async function portalApprovals(clientId: string) {
  const posts = await listContent();
  return posts.filter((p) => p.clientId === clientId && p.status === 'IN_REVIEW').sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
}

export async function portalInvoices(clientId: string) {
  const invoices = await listInvoices();
  return invoices
    .filter((inv) => inv.clientId === clientId && PORTAL_INVOICE_STATUSES.includes(effectiveStatus(inv)))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export async function portalReport(clientId: string) {
  return loadReport({ days: 30, clientId });
}

export async function portalFiles(clientId: string) {
  const assets = await listAssets();
  return assets.filter((a) => a.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function portalMessages(clientId: string) {
  const messages = await threadRepository.list();
  return messages.filter((m) => m.clientId === clientId).sort((a, b) => a.at.localeCompare(b.at));
}

export async function portalSummary(clientId: string) {
  const [approvals, invoices, messages] = await Promise.all([portalApprovals(clientId), portalInvoices(clientId), portalMessages(clientId)]);
  const openInvoices = invoices.filter((inv) => effectiveStatus(inv) === 'SENT' || effectiveStatus(inv) === 'OVERDUE');
  return { approvals: approvals.length, openInvoices: openInvoices.length, messages: messages.length };
}
