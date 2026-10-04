import 'server-only';
import { toDateKey } from '@/shared/lib/format';
import { timeRepository, timersRepository, type ActiveTimer, type TimeEntry } from '../data/time.repository';

export async function listEntries(): Promise<TimeEntry[]> {
  const rows = await timeRepository.list();
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export async function activeTimerFor(userId: string): Promise<ActiveTimer | undefined> {
  return (await timersRepository.list()).find((t) => t.userId === userId);
}

/** Monday-based start of the current week as a yyyy-mm-dd key. */
export function weekStartKey(now: Date = new Date()): string {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toDateKey(d);
}

export function minutesThisWeek(entries: TimeEntry[], userId?: string): number {
  const start = weekStartKey();
  return entries.filter((e) => (!userId || e.userId === userId) && e.date >= start).reduce((a, e) => a + e.minutes, 0);
}
