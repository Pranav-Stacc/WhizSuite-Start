'use server';

import { Permissions, createShootFormSchema } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { authorize } from '@/shared/auth/permissions';
import { getSession } from '@/shared/auth/session';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import type { FormDialogResult } from '@/shared/forms/form-dialog';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';

export async function createShootAction(raw: unknown): Promise<ActionResult<FormDialogResult>> {
  return guarded(async () => {
    await authorize(Permissions.PROJECTS_CREATE);
    const parsed = parseInput(createShootFormSchema, raw);
    if (!parsed.ok) return parsed.result;
    if (!isLiveMode) return fail(t('toast.failed'));

    const session = await getSession();
    if (!session?.orgId) return fail(t('toast.failed'));

    const taskTitles = (parsed.data.taskTitles ?? '')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const startsAt = new Date(parsed.data.startsAt).toISOString();
    const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : undefined;

    const created = await apiFetch<{
      event: { id: string };
      folders: Array<{ id: string; path: string }>;
    }>(orgPath(session.orgId, 'calendar/shoots'), {
      method: 'POST',
      body: {
        title: parsed.data.title,
        startsAt,
        endsAt,
        allDay: parsed.data.allDay,
        clientId: parsed.data.clientId,
        projectId: parsed.data.projectId || undefined,
        createFolders: parsed.data.createFolders,
        taskTitles,
      },
    });

    await refreshData('calendar', 'media', 'tasks', 'projects');
    return succeed(
      { href: `/media?client=${parsed.data.clientId}` },
      t('calendar.shoot.created', { count: String(created.folders.length) }),
    );
  });
}
