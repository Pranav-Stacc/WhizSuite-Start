import 'server-only';
import { notificationsRepository, type Notification } from '../data/notifications.repository';

export async function listForUser(userId: string): Promise<Notification[]> {
  const rows = await notificationsRepository.list();
  return rows.filter((n) => n.userId === userId).sort((a, b) => b.at.localeCompare(a.at));
}

export async function unreadCount(userId: string): Promise<number> {
  return (await listForUser(userId)).filter((n) => !n.read).length;
}

export async function pushNotification(input: Omit<Notification, 'id' | 'read' | 'at'>): Promise<void> {
  await notificationsRepository.create({ ...input, read: false, at: new Date().toISOString() });
}
