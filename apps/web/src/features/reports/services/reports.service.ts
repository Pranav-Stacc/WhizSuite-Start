import 'server-only';
import { Platforms, type InvoiceStatus, type Platform } from '@agency-os/contracts';
import type { InvoiceView } from '@/features/invoices/services/invoices.service';
import { isLiveMode } from '@/shared/config/env';
import { formatDate } from '@/shared/lib/format';
import { series } from '@/shared/lib/seeded';
import { dailyMetrics, loadMetricData, reachByPlatform as liveReachByPlatform, totalsByClient } from './live-metrics';
import { listIntegrations, type Integration } from '@/features/integrations/services/integrations.service';
import { listContent } from '@/features/content/services/content.service';
import type { Post } from '@/features/content/data/content.repository';

export const REPORT_RANGES = [7, 30, 90] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export interface MetricSeries {
  labels: string[];
  reach: number[];
  engagement: number[];
  followers: number[];
}

export interface MetricTotals {
  reach: number;
  engagement: number;
  engagementRate: number;
  followerGrowth: number;
  followers: number;
  posts: number;
}

export interface ReportFilter {
  clientId?: string;
  platform?: Platform;
  days: ReportRange;
}

const ENGAGEMENT_RATE = 0.047;
const REACH_SHARE = 0.34;

function dayLabels(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return formatDate(d);
  });
}

function addInto(target: number[], source: number[]): void {
  source.forEach((value, i) => {
    target[i] = (target[i] ?? 0) + value;
  });
}

/** Deterministic demo-mode analytics per connected account; live mode reads recorded snapshots instead. */
export function buildMetrics(integrations: Integration[], filter: ReportFilter): MetricSeries {
  const { days } = filter;
  const reach: number[] = Array.from({ length: days }, () => 0);
  const engagement: number[] = Array.from({ length: days }, () => 0);
  const followers: number[] = Array.from({ length: days }, () => 0);

  for (const account of integrations) {
    if (!account.connected) continue;
    if (filter.clientId && account.clientId !== filter.clientId) continue;
    if (filter.platform && account.platform !== filter.platform) continue;
    const dailyReach = series(`${account.id}-reach`, days, account.followers * REACH_SHARE, account.followers * 0.12, account.followers * 0.002);
    addInto(reach, dailyReach);
    addInto(engagement, dailyReach.map((r, i) => Math.round(r * ENGAGEMENT_RATE * (1 + (i % 5) * 0.03))));
    addInto(followers, series(`${account.id}-followers`, days, account.followers - days * 12, 20, 12));
  }
  return { labels: dayLabels(days), reach, engagement, followers };
}

export function totals(metrics: MetricSeries, posts: number): MetricTotals {
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const reach = sum(metrics.reach);
  const engagement = sum(metrics.engagement);
  const first = metrics.followers[0] ?? 0;
  const last = metrics.followers[metrics.followers.length - 1] ?? 0;
  return {
    reach,
    engagement,
    engagementRate: reach ? (engagement / reach) * 100 : 0,
    followerGrowth: last - first,
    followers: last,
    posts,
  };
}

export interface PlatformReach {
  platform: Platform;
  reach: number;
}

export type TopPost = Post & { reach: number; engagement: number };

export interface Report {
  metrics: MetricSeries;
  totals: MetricTotals;
  topPosts: TopPost[];
  byPlatform: PlatformReach[];
}

function reachByPlatform(integrations: Integration[], filter: ReportFilter): PlatformReach[] {
  return Platforms.filter((platform) => !filter.platform || filter.platform === platform)
    .map((platform) => ({ platform, reach: buildMetrics(integrations, { ...filter, platform }).reach.reduce((a, b) => a + b, 0) }))
    .filter((row) => row.reach > 0)
    .sort((a, b) => b.reach - a.reach);
}

export interface ClientReach {
  clientId: string;
  reach: number;
  engagement: number;
}

/** Reach and engagement per client for the active filter, best first. */
export async function clientLeaderboard(filter: ReportFilter, clientIds: string[]): Promise<ClientReach[]> {
  if (isLiveMode) {
    const totals = totalsByClient(await loadMetricData(filter.days), { platform: filter.platform });
    return clientIds
      .map((clientId) => ({ clientId, reach: totals.get(clientId)?.reach ?? 0, engagement: totals.get(clientId)?.engagement ?? 0 }))
      .filter((row) => row.reach > 0)
      .sort((a, b) => b.reach - a.reach);
  }
  const integrations = await listIntegrations();
  return clientIds
    .map((clientId) => {
      const metrics = buildMetrics(integrations, { ...filter, clientId });
      return { clientId, reach: metrics.reach.reduce((a, b) => a + b, 0), engagement: metrics.engagement.reduce((a, b) => a + b, 0) };
    })
    .filter((row) => row.reach > 0)
    .sort((a, b) => b.reach - a.reach);
}

const CSV_HEADER = ['date', 'reach', 'engagement', 'followers'] as const;

/** Daily metrics as RFC 4180 CSV, ready to open in a spreadsheet. */
export function metricsToCsv(metrics: MetricSeries): string {
  const rows = metrics.labels.map((label, i) => [label, metrics.reach[i] ?? 0, metrics.engagement[i] ?? 0, metrics.followers[i] ?? 0].join(','));
  return [CSV_HEADER.join(','), ...rows].join('\r\n');
}

function publishedInScope(posts: Post[], filter: ReportFilter): Post[] {
  return posts.filter((p) => p.status === 'PUBLISHED' && (!filter.clientId || p.clientId === filter.clientId) && (!filter.platform || p.platforms.includes(filter.platform)));
}

/** Live report from recorded snapshots; per-post performance appears once snapshots are attributed to posts. */
async function loadLiveReport(filter: ReportFilter): Promise<Report> {
  const [data, posts] = await Promise.all([loadMetricData(filter.days), listContent()]);
  const scope = { clientId: filter.clientId, platform: filter.platform };
  const metrics = { labels: dayLabels(filter.days), ...dailyMetrics(data, filter.days, scope) };
  return { metrics, totals: totals(metrics, publishedInScope(posts, filter).length), topPosts: [], byPlatform: liveReachByPlatform(data, scope) };
}

export async function loadReport(filter: ReportFilter): Promise<Report> {
  if (isLiveMode) return loadLiveReport(filter);
  const [integrations, posts] = await Promise.all([listIntegrations(), listContent()]);
  const metrics = buildMetrics(integrations, filter);
  const published = publishedInScope(posts, filter);
  const topPosts = published
    .map((p) => {
      const [reach = 0] = series(`${p.id}-post`, 1, 6000 + (p.title.length % 7) * 2500, 3000);
      return { ...p, reach, engagement: Math.round(reach * (ENGAGEMENT_RATE + (p.platforms.length % 3) * 0.01)) };
    })
    .sort((a, b) => b.engagement - a.engagement);
  return { metrics, totals: totals(metrics, published.length), topPosts, byPlatform: reachByPlatform(integrations, filter) };
}

const UNBILLED_STATUSES: ReadonlySet<InvoiceStatus> = new Set(['DRAFT', 'VOID']);

const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

/** Invoiced amount (minor units) per calendar month for the last `months`, oldest first; drafts and voids excluded. */
export function invoicedByMonth(invoices: Pick<InvoiceView, 'issueDate' | 'total' | 'status'>[], months: number): number[] {
  const current = monthIndex(new Date());
  const totals = Array.from({ length: months }, () => 0);
  for (const invoice of invoices) {
    if (UNBILLED_STATUSES.has(invoice.status)) continue;
    const slot = months - 1 - (current - monthIndex(new Date(invoice.issueDate)));
    if (slot >= 0 && slot < months) totals[slot] = (totals[slot] ?? 0) + invoice.total;
  }
  return totals;
}

/** Percentage change between the last two points, or undefined when there is no baseline. */
export function lastChangePercent(values: number[]): number | undefined {
  const previous = values.at(-2);
  const latest = values.at(-1);
  if (!previous || latest === undefined) return undefined;
  return Math.round(((latest - previous) / previous) * 100);
}

export function monthLabels(months: number): string[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    return formatDate(d, { month: 'short' });
  });
}

