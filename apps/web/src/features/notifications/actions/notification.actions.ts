'use server';

import { apiFetch } from '@/shared/api/api-client';
import { markAllNotificationsRead, markNotificationRead } from '@/shared/api/live/mutations';
import { orgPath } from '@/shared/api/live/utils';
import { requireSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { recordAudit } from '@/features/audit/services/audit.service';
import { notificationsRepository } from '../data/notifications.repository';
import { listForUser } from '../services/notifications.service';

async function orgId(): Promise<string> {
  const session = await requireSession();
  return session.orgId;
}

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

/** Registers a browser FCM token so the API can deliver web push. */
export async function registerWebPushDeviceAction(token: string): Promise<ActionResult<{ deviceId: string }>> {
  return guarded(async () => {
    if (!isLiveMode) return fail('Push is only available in live mode');
    const trimmed = token.trim();
    if (!trimmed) return fail('Missing push token');
    const org = await orgId();
    const device = await apiFetch<{ id: string }>(`${orgPath(org, 'notifications')}/devices`, {
      method: 'POST',
      body: {
        token: trimmed,
        platform: 'WEB',
        locale: 'en',
      },
    });
    return succeed({ deviceId: device.id });
  });
}

export async function unregisterWebPushDeviceAction(deviceId: string): Promise<ActionResult> {
  return guarded(async () => {
    if (!isLiveMode || !deviceId.trim()) return succeed();
    const org = await orgId();
    await apiFetch(`${orgPath(org, 'notifications')}/devices/${deviceId}`, { method: 'DELETE' });
    return succeed();
  });
}
