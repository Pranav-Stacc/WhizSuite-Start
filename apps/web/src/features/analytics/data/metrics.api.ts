import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { orgPath } from '@/shared/api/live/utils';

export const METRIC_KEYS = { reach: 'reach', engagement: 'engagement', followers: 'followers' } as const;
export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];

const TAG = 'analytics';

export interface MetricSnapshot {
  metricKey: string;
  channelId: string | null;
  contentVariantId: string | null;
  value: number;
  recordedAt: string;
}

/** Recorded metric snapshots for the organisation, newest first. */
export async function fetchMetricSnapshots(query: { from?: Date; metrics?: MetricKey[] } = {}): Promise<MetricSnapshot[]> {
  const org = (await getSession())?.orgId ?? '';
  if (!org) return [];
  return apiFetch<MetricSnapshot[]>(orgPath(org, 'analytics/metrics'), {
    query: { from: query.from?.toISOString(), metrics: query.metrics?.join(',') },
    tags: [`org:${org}:${TAG}`],
  });
}
