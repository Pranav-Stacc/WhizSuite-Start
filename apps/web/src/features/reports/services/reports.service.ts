import 'server-only';
import { Platforms, type Platform } from '@agency-os/contracts';
import { series } from '@/shared/lib/seeded';
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
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
}

function addInto(target: number[], source: number[]): void {
  source.forEach((value, i) => {
    target[i] = (target[i] ?? 0) + value;
  });
}

/** Deterministic demo analytics per connected account; replaced by provider data once integrations sync. */
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

export async function loadReport(filter: ReportFilter): Promise<Report> {
  const [integrations, posts] = await Promise.all([listIntegrations(), listContent()]);
  const metrics = buildMetrics(integrations, filter);
  const published = posts.filter((p) => p.status === 'PUBLISHED' && (!filter.clientId || p.clientId === filter.clientId) && (!filter.platform || p.platforms.includes(filter.platform)));
  const topPosts = published
    .map((p) => {
      const [reach = 0] = series(`${p.id}-post`, 1, 6000 + (p.title.length % 7) * 2500, 3000);
      return { ...p, reach, engagement: Math.round(reach * (ENGAGEMENT_RATE + (p.platforms.length % 3) * 0.01)) };
    })
    .sort((a, b) => b.engagement - a.engagement);
  return { metrics, totals: totals(metrics, published.length), topPosts, byPlatform: reachByPlatform(integrations, filter) };
}

/** Last `months` of revenue in minor units, ending with the real current-month figure. */
export function revenueSeries(seed: string, recurringMinor: number, months: number, currentMinor: number): number[] {
  const history = series(seed, months - 1, recurringMinor * 0.78, recurringMinor * 0.06, recurringMinor * 0.03);
  return [...history, currentMinor];
}

export function monthLabels(months: number): string[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    return d.toLocaleDateString('en-IN', { month: 'short' });
  });
}

