import 'server-only';
import type {
  CalendarFeedItem,
  CalendarSourceType,
  ContentStatus,
  Platform,
  TaskStatus,
} from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { getSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { toDateKey } from '@/shared/lib/format';
import { clientsById } from '@/features/clients/services/clients.service';
import type { Post } from '@/features/content/data/content.repository';
import { listContent } from '@/features/content/services/content.service';
import { listTasks } from '@/features/tasks/services/tasks.service';

export type CalendarKind =
  | 'content'
  | 'task'
  | 'shoot'
  | 'approval'
  | 'campaign'
  | 'invoice'
  | 'milestone'
  | 'meeting'
  | 'deadline'
  | 'manual';

export type CalendarItem = {
  kind: CalendarKind;
  id: string;
  title: string;
  at: string;
  href: string;
  clientId: string;
  clientColor: string;
  status?: string;
  platforms?: Platform[];
  thumb?: { url?: string; mimeType: string };
};

const FALLBACK_COLOR = '#8D9B98';

const SOURCE_TO_KIND: Record<CalendarSourceType, CalendarKind> = {
  CONTENT: 'content',
  TASK: 'task',
  SHOOT: 'shoot',
  APPROVAL: 'approval',
  CAMPAIGN: 'campaign',
  INVOICE: 'invoice',
  MILESTONE: 'milestone',
  MEETING: 'meeting',
  DEADLINE: 'deadline',
  MANUAL: 'manual',
};

const KIND_HREF: Record<CalendarKind, (item: CalendarFeedItem) => string> = {
  content: (item) => item.href ?? `/content/${item.sourceId}`,
  task: (item) => item.href ?? `/tasks?edit=${item.sourceId}`,
  shoot: () => '/calendar',
  approval: (item) => item.href ?? `/approvals?id=${item.sourceId}`,
  campaign: (item) => item.href ?? '/content',
  invoice: (item) => item.href ?? `/invoices?id=${item.sourceId}`,
  milestone: (item) => item.href ?? (item.projectId ? `/projects/${item.projectId}` : '/projects'),
  meeting: () => '/calendar',
  deadline: () => '/calendar',
  manual: () => '/calendar',
};

/** Calendar entry for a scheduled post (demo / offline path). */
export function contentCalendarItem(post: Post & { scheduledAt: string }, clientColor: string): CalendarItem {
  const [cover] = post.media;
  return {
    kind: 'content',
    id: post.id,
    title: post.title,
    at: post.scheduledAt,
    href: `/content/${post.id}`,
    clientId: post.clientId,
    clientColor,
    platforms: post.platforms,
    status: post.status as ContentStatus,
    thumb: cover ? { url: cover.url, mimeType: cover.mimeType } : undefined,
  };
}

export function isScheduled(post: Post): post is Post & { scheduledAt: string } {
  return Boolean(post.scheduledAt);
}

function fromFeedItem(
  item: CalendarFeedItem,
  colorOf: (clientId: string) => string,
): CalendarItem {
  const kind = SOURCE_TO_KIND[item.sourceType] ?? 'manual';
  const platforms = Array.isArray(item.metadata?.platforms)
    ? (item.metadata.platforms as Platform[])
    : undefined;
  return {
    kind,
    id: item.sourceId || item.id,
    title: item.title,
    at: item.startsAt,
    href: KIND_HREF[kind](item),
    clientId: item.clientId ?? '',
    clientColor: colorOf(item.clientId ?? ''),
    status: item.status ?? undefined,
    platforms,
  };
}

async function listFromApi(from: string, to: string, clientId?: string): Promise<CalendarItem[]> {
  const session = await getSession();
  const org = session?.orgId;
  if (!org) return [];
  const params = new URLSearchParams({ from, to });
  if (clientId) params.set('clientId', clientId);
  const raw = await apiFetch<CalendarFeedItem[]>(
    `${orgPath(org, 'calendar/feed')}?${params}`,
    { tags: [`org:${org}:calendar`] },
  );
  const clients = await clientsById();
  const colorOf = (id: string) => clients.get(id)?.color ?? FALLBACK_COLOR;
  return (Array.isArray(raw) ? raw : []).map((item) => fromFeedItem(item, colorOf));
}

/** Demo / offline: scheduled content + open task dues only. */
async function listDemo(): Promise<CalendarItem[]> {
  const [content, tasks, clients] = await Promise.all([listContent(), listTasks(), clientsById()]);
  const colorOf = (clientId: string): string => clients.get(clientId)?.color ?? FALLBACK_COLOR;

  const posts = content.filter(isScheduled).map((p) => contentCalendarItem(p, colorOf(p.clientId)));

  const deadlines: CalendarItem[] = tasks
    .filter((x) => x.dueDate && x.status !== 'DONE')
    .map((x) => ({
      kind: 'task' as const,
      id: x.id,
      title: x.title,
      at: x.dueDate as string,
      href: `/tasks?edit=${x.id}`,
      clientId: x.clientId,
      clientColor: colorOf(x.clientId),
      status: x.status as TaskStatus,
    }));

  return [...posts, ...deadlines];
}

/**
 * Unified calendar for the visible range.
 * Live mode uses `GET …/calendar/feed` (scoped federation); demo mode merges content + tasks.
 */
export async function listCalendarItems(opts?: {
  from?: string;
  to?: string;
  clientId?: string;
}): Promise<CalendarItem[]> {
  if (isLiveMode && opts?.from && opts?.to) {
    try {
      return await listFromApi(opts.from, opts.to, opts.clientId);
    } catch {
      return listDemo();
    }
  }
  return listDemo();
}

/** Buckets dated items by local `YYYY-MM-DD`, each bucket sorted by time. */
export function groupByDay<T extends { at: string }>(items: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = toDateKey(item.at);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  return map;
}

/** Monday-first grid of dates covering the whole month, padded to full weeks. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => new Date(year, month, 1 - offset + i));
}
