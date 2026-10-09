import type { MetricKey, MetricSnapshot } from '../data/metrics.api';

export interface LatestValue {
  value: number;
  recordedAt: string;
}

/** Most recent value of a metric per channel. */
export function latestByChannel(snapshots: MetricSnapshot[], metric: MetricKey): Map<string, LatestValue> {
  const latest = new Map<string, LatestValue>();
  for (const s of snapshots) {
    if (s.metricKey !== metric || !s.channelId) continue;
    const current = latest.get(s.channelId);
    if (!current || s.recordedAt > current.recordedAt) latest.set(s.channelId, { value: s.value, recordedAt: s.recordedAt });
  }
  return latest;
}
