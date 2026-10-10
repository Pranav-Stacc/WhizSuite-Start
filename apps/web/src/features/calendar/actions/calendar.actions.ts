'use server';

import { Permissions, createCalendarEventFormSchema } from '@agency-os/contracts';
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

export async function createCalendarEventAction(
  raw: unknown,
): Promise<ActionResult<FormDialogResult>> {
  return guarded(async () => {
    await authorize(Permissions.CALENDAR_CREATE);
    const parsed = parseInput(createCalendarEventFormSchema, raw);
    if (!parsed.ok) return parsed.result;
    if (!isLiveMode) return fail(t('toast.failed'));

    const session = await getSession();
    if (!session?.orgId) return fail(t('toast.failed'));

    const startsAt = new Date(parsed.data.startsAt).toISOString();
    const endsAt = parsed.data.endsAt
      ? new Date(parsed.data.endsAt).toISOString()
      : undefined;

    await apiFetch(orgPath(session.orgId, 'calendar/items'), {
      method: 'POST',
      body: {
        sourceType: parsed.data.sourceType,
        title: parsed.data.title,
        startsAt,
        endsAt,
        allDay: parsed.data.allDay,
        clientId: parsed.data.clientId || undefined,
        syncToGoogle: parsed.data.syncToGoogle,
      },
    });

    await refreshData('calendar');
    return succeed({ href: '/calendar' }, t('calendar.event.created'));
  });
}

export async function setCalendarItemSyncAction(input: {
  id: string;
  syncToGoogle: boolean;
}): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.CALENDAR_EDIT);
    if (!isLiveMode) return fail(t('toast.failed'));
    const session = await getSession();
    if (!session?.orgId) return fail(t('toast.failed'));

    await apiFetch(orgPath(session.orgId, `calendar/items/${input.id}`), {
      method: 'PATCH',
      body: { syncToGoogle: input.syncToGoogle },
    });
    await refreshData('calendar');
    return succeed(undefined, t('calendar.sync.toggled'));
  });
}
