import 'server-only';
import type { ContentStatus, Platform, TaskStatus } from '@agency-os/contracts';
import { toDateKey } from '@/shared/lib/format';
import { clientsById } from '@/features/clients/services/clients.service';
import type { Post } from '@/features/content/data/content.repository';
import { listContent } from '@/features/content/services/content.service';
import { listTasks } from '@/features/tasks/services/tasks.service';

export type CalendarItem =
  | {
      kind: 'content';
      id: string;
      title: string;
      at: string;
      href: string;
      clientId: string;
      clientColor: string;
      platforms: Platform[];
      status: ContentStatus;
      thumb?: { url?: string; mimeType: string };
    }
  | { kind: 'task'; id: string; title: string; at: string; href: string; clientId: string; clientColor: string; status: TaskStatus };

const FALLBACK_COLOR = '#8D9B98';

/** Calendar entry for a scheduled post. */
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
    status: post.status,
    thumb: cover ? { url: cover.url, mimeType: cover.mimeType } : undefined,
  };
}

export function isScheduled(post: Post): post is Post & { scheduledAt: string } {
  return Boolean(post.scheduledAt);
}

/** Everything with a date: scheduled content plus open task deadlines, newest-first order not guaranteed. */
export async function listCalendarItems(): Promise<CalendarItem[]> {
  const [content, tasks, clients] = await Promise.all([listContent(), listTasks(), clientsById()]);
  const colorOf = (clientId: string): string => clients.get(clientId)?.color ?? FALLBACK_COLOR;

  const posts = content.filter(isScheduled).map((p) => contentCalendarItem(p, colorOf(p.clientId)));

  const deadlines: CalendarItem[] = tasks
    .filter((x) => x.dueDate && x.status !== 'DONE')
    .map((x) => ({
      kind: 'task',
      id: x.id,
      title: x.title,
      at: x.dueDate as string,
      href: `/tasks?edit=${x.id}`,
      clientId: x.clientId,
      clientColor: colorOf(x.clientId),
      status: x.status,
    }));

  return [...posts, ...deadlines];
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
