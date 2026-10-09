import 'server-only';
import type { InvoiceStatus } from '@agency-os/contracts';
import { listContent } from '@/features/content/services/content.service';
import { getClient } from '@/features/clients/services/clients.service';
import { listAssets } from '@/features/media/services/media.service';
import { listInvoices, effectiveStatus } from '@/features/invoices/services/invoices.service';
import { loadReport, type Report } from '@/features/reports/services/reports.service';
import { memberDirectory } from '@/features/team/services/members.service';
import { ApiError } from '@/shared/api/api-client';
import { fetchClientThread } from '@/shared/api/live/feedback';
import { getSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { threadRepository, type ThreadMessage } from '../data/thread.repository';

const PORTAL_INVOICE_STATUSES: InvoiceStatus[] = ['SENT', 'PAID', 'OVERDUE'];

const EMPTY_REPORT: Report = {
  metrics: { labels: [], reach: [], engagement: [], followers: [] },
  totals: { reach: 0, engagement: 0, engagementRate: 0, followerGrowth: 0, followers: 0, posts: 0 },
  topPosts: [],
  byPlatform: [],
};

/** Portal chrome must degrade when a scoped client lacks a permission — never crash the layout. */
async function softFail<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError) return fallback;
    throw error;
  }
}

export async function portalClient(clientId: string) {
  return softFail(() => getClient(clientId), undefined);
}

/** Everything the client may see in the review desk: drafts stay internal to the agency. */
export async function portalContent(clientId: string) {
  const posts = await softFail(() => listContent(), []);
  return posts.filter((p) => p.clientId === clientId && p.status !== 'DRAFT');
}

export async function portalApprovals(clientId: string) {
  const posts = await softFail(() => listContent(), []);
  return posts.filter((p) => p.clientId === clientId && p.status === 'IN_REVIEW').sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
}

export async function portalInvoices(clientId: string) {
  const invoices = await softFail(() => listInvoices(), []);
  return invoices
    .filter((inv) => inv.clientId === clientId && PORTAL_INVOICE_STATUSES.includes(effectiveStatus(inv)))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export const PORTAL_REPORT_DAYS = 30;

export async function portalReport(clientId: string) {
  return softFail(() => loadReport({ days: PORTAL_REPORT_DAYS, clientId }), EMPTY_REPORT);
}

export async function portalFiles(clientId: string) {
  const assets = await softFail(() => listAssets(), []);
  return assets.filter((a) => a.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const PORTAL_CACHE_TAG = 'portal';

/** Agency authors the client cannot look up are shown under the agency's name. */
async function liveMessages(clientId: string): Promise<ThreadMessage[]> {
  const [comments, directory, session] = await Promise.all([
    softFail(() => fetchClientThread(clientId, PORTAL_CACHE_TAG), []),
    softFail(() => memberDirectory(), new Map()),
    getSession(),
  ]);
  return comments.map((c) => {
    const author = directory.get(c.authorId);
    return {
      id: c.id,
      clientId,
      fromClient: author?.isClient ?? false,
      authorName: author?.name ?? session?.orgName ?? '',
      body: c.body,
      at: c.createdAt,
    };
  });
}

/** The agency ↔ client conversation, oldest first; shared by the portal and the client workspace. */
export async function clientThread(clientId: string): Promise<ThreadMessage[]> {
  const messages = isLiveMode
    ? await liveMessages(clientId)
    : (await softFail(() => threadRepository.list(), [])).filter((m) => m.clientId === clientId);
  return messages.sort((a, b) => a.at.localeCompare(b.at));
}

export async function portalSummary(clientId: string) {
  const empty = { approvals: 0, openInvoices: 0, messages: 0 };
  return softFail(async () => {
    const [approvals, invoices, messages] = await Promise.all([
      portalApprovals(clientId),
      portalInvoices(clientId),
      clientThread(clientId),
    ]);
    const openInvoices = invoices.filter((inv) => effectiveStatus(inv) === 'SENT' || effectiveStatus(inv) === 'OVERDUE');
    return { approvals: approvals.length, openInvoices: openInvoices.length, messages: messages.length };
  }, empty);
}
