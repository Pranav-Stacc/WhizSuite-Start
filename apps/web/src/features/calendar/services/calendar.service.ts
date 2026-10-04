import 'server-only';
import type { ContentStatus, Platform, TaskStatus } from '@agency-os/contracts';
import { clientsById } from '@/features/clients/services/clients.service';
import { listContent } from '@/features/content/services/content.service';
import { listTasks } from '@/features/tasks/services/tasks.service';

export type CalendarItem =
  | { kind: 'content'; id: string; title: string; at: string; href: string; clientId: string; clientColor: string; platforms: Platform[]; status: ContentStatus }
  | { kind: 'task'; id: string; title: string; at: string; href: string; clientId: string; clientColor: string; status: TaskStatus };

const FALLBACK_COLOR = '#8D9B98';

/** Everything with a date: scheduled content plus open task deadlines, newest-first order not guaranteed. */
export async function listCalendarItems(): Promise<CalendarItem[]> {
  const [content, tasks, clients] = await Promise.all([listContent(), listTasks(), clientsById()]);
  const colorOf = (clientId: string): string => clients.get(clientId)?.color ?? FALLBACK_COLOR;

  const posts: CalendarItem[] = content
    .filter((p) => p.scheduledAt)
    .map((p) => ({
      kind: 'content',
      id: p.id,
      title: p.title,
      at: p.scheduledAt as string,
      href: `/content/${p.id}`,
      clientId: p.clientId,
      clientColor: colorOf(p.clientId),
      platforms: p.platforms,
      status: p.status,
    }));

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

/** Monday-first grid of dates covering the whole month, padded to full weeks. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => new Date(year, month, 1 - offset + i));
}
