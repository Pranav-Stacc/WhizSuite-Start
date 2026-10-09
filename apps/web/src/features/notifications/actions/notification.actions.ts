'use server';

import { requireSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { markAllNotificationsRead, markNotificationRead } from '@/shared/api/live/mutations';
import { succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { recordAudit } from '@/features/audit/services/audit.service';
import { notificationsRepository } from '../data/notifications.repository';
import { listForUser } from '../services/notifications.service';

export async function markAllReadAction(): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    if (isLiveMode) {
      await markAllNotificationsRead();
    } else {
      const unread = (await listForUser(session.userId)).filter((n) => !n.read);
      await Promise.all(unread.map((n) => notificationsRepository.update(n.id, { read: true })));
      await recordAudit({ action: 'notification.read_all', entityType: 'notification', entityId: session.userId, entityLabel: session.name, summary: `Marked ${unread.length} notifications as read` });
    }
    await refreshData('notifications');
    return succeed(undefined, undefined);
  });
}

export async function markReadAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    if (isLiveMode) {
      await markNotificationRead(id);
    } else {
      const target = await notificationsRepository.get(id);
      if (target?.userId === session.userId) await notificationsRepository.update(id, { read: true });
    }
    await refreshData('notifications');
    return succeed();
  });
}
