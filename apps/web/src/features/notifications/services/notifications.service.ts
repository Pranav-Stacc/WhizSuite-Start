import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import { notificationsLive } from '@/shared/api/live/bindings';
import { unwrapList } from '@/shared/api/live/utils';
import { isLiveMode } from '@/shared/config/env';
import { getSession } from '@/shared/auth/session';
import { notificationsRepository, type Notification } from '../data/notifications.repository';

export async function listForUser(userId: string): Promise<Notification[]> {
  if (isLiveMode) {
    const session = await getSession();
    const org = session?.orgId ?? '';
    if (!org) return [];
    const live = notificationsLive(userId);
    const data = await apiFetch<unknown>(live.path(org), { tags: [`org:${org}:${live.tag}`] });
    return unwrapList(data).map((raw) => live.fromApi(raw)).sort((a, b) => b.at.localeCompare(a.at));
  }
  const rows = await notificationsRepository.list();
  return rows.filter((n) => n.userId === userId).sort((a, b) => b.at.localeCompare(a.at));
}

export async function unreadCount(userId: string): Promise<number> {
  return (await listForUser(userId)).filter((n) => !n.read).length;
}

/** Demo-only helper; live notifications are emitted by the API on domain events. */
export async function pushNotification(input: Omit<Notification, 'id' | 'read' | 'at'>): Promise<void> {
  if (isLiveMode) return;
  await notificationsRepository.create({ ...input, read: false, at: new Date().toISOString() });
}
