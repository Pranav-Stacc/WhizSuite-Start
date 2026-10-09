import 'server-only';
import type { Platform } from '@agency-os/contracts';
import { METRIC_KEYS, fetchMetricSnapshots, type MetricSnapshot } from '@/features/analytics/data/metrics.api';
import { fetchSocialAccounts } from '@/features/integrations/data/social-accounts.api';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ChannelOwner {
  clientId: string;
  platform: Platform;
}

export interface Scope {
  clientId?: string;
  platform?: Platform;
}

export interface DailyMetrics {
  reach: number[];
  engagement: number[];
  followers: number[];
}

export interface MetricData {
  snapshots: MetricSnapshot[];
  owners: Map<string, ChannelOwner>;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

function windowStart(days: number): Date {
  return new Date(startOfDay(new Date()).getTime() - (days - 1) * MS_PER_DAY);
}

/** Snapshots for the window plus who owns each channel, fetched once per request. */
export async function loadMetricData(days: number): Promise<MetricData> {
  const [snapshots, accounts] = await Promise.all([
    fetchMetricSnapshots({ from: windowStart(days), metrics: [METRIC_KEYS.reach, METRIC_KEYS.engagement, METRIC_KEYS.followers] }),
    fetchSocialAccounts(),
  ]);
  const owners = new Map<string, ChannelOwner>();
  for (const account of accounts) {
    for (const channelId of account.channelIds) owners.set(channelId, { clientId: account.clientId, platform: account.platform });
  }
  return { snapshots, owners };
}

function inScope(owner: ChannelOwner | undefined, scope: Scope): boolean {
  if (!scope.clientId && !scope.platform) return true;
  if (!owner) return false;
  return (!scope.clientId || owner.clientId === scope.clientId) && (!scope.platform || owner.platform === scope.platform);
}

/** Daily reach and engagement sums, and the follower total carried forward per channel. */
export function dailyMetrics(data: MetricData, days: number, scope: Scope): DailyMetrics {
  const start = windowStart(days).getTime();
  const reach = Array.from({ length: days }, () => 0);
  const engagement = Array.from({ length: days }, () => 0);
  const followersByChannel = new Map<string, Array<number | undefined>>();
  const followersAt = new Map<string, string>();

  for (const s of data.snapshots) {
    if (!s.channelId || !inScope(data.owners.get(s.channelId), scope)) continue;
    const day = Math.floor((startOfDay(new Date(s.recordedAt)).getTime() - start) / MS_PER_DAY);
    if (day < 0 || day >= days) continue;
    if (s.metricKey === METRIC_KEYS.reach) reach[day] = (reach[day] ?? 0) + s.value;
    else if (s.metricKey === METRIC_KEYS.engagement) engagement[day] = (engagement[day] ?? 0) + s.value;
    else if (s.metricKey === METRIC_KEYS.followers) {
      const series = followersByChannel.get(s.channelId) ?? Array.from({ length: days }, () => undefined);
      const key = `${s.channelId}:${day}`;
      const seenAt = followersAt.get(key);
      if (!seenAt || s.recordedAt > seenAt) {
        series[day] = s.value;
        followersAt.set(key, s.recordedAt);
      }
      followersByChannel.set(s.channelId, series);
    }
  }

  const followers = Array.from({ length: days }, () => 0);
  for (const series of followersByChannel.values()) {
    let carried = 0;
    series.forEach((value, day) => {
      carried = value ?? carried;
      followers[day] = (followers[day] ?? 0) + carried;
    });
  }
  return { reach, engagement, followers };
}

/** Total reach per platform within the scope, best first. */
export function reachByPlatform(data: MetricData, scope: Scope): Array<{ platform: Platform; reach: number }> {
  const totals = new Map<Platform, number>();
  for (const s of data.snapshots) {
    if (s.metricKey !== METRIC_KEYS.reach || !s.channelId) continue;
    const owner = data.owners.get(s.channelId);
    if (!owner || !inScope(owner, scope)) continue;
    totals.set(owner.platform, (totals.get(owner.platform) ?? 0) + s.value);
  }
  return [...totals].map(([platform, reach]) => ({ platform, reach })).sort((a, b) => b.reach - a.reach);
}

/** Reach and engagement per client within the scope. */
export function totalsByClient(data: MetricData, scope: Scope): Map<string, { reach: number; engagement: number }> {
  const totals = new Map<string, { reach: number; engagement: number }>();
  for (const s of data.snapshots) {
    if (!s.channelId) continue;
    const owner = data.owners.get(s.channelId);
    if (!owner || !inScope(owner, scope)) continue;
    const entry = totals.get(owner.clientId) ?? { reach: 0, engagement: 0 };
    if (s.metricKey === METRIC_KEYS.reach) entry.reach += s.value;
    else if (s.metricKey === METRIC_KEYS.engagement) entry.engagement += s.value;
    totals.set(owner.clientId, entry);
  }
  return totals;
}
