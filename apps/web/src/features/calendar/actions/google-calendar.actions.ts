'use server';

import { Permissions } from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import {
  beginGoogleCalendarConnect,
  disconnectGoogleCalendar,
  pullGoogleCalendar,
  updateGoogleCalendarSettings,
} from '../services/google-calendar.service';

export async function connectGoogleCalendarAction(): Promise<
  ActionResult<{ authorizeUrl: string }>
> {
  return guarded(async () => {
    await authorize(Permissions.CALENDAR_SYNC);
    if (!isLiveMode) return fail(t('toast.failed'));
    const result = await beginGoogleCalendarConnect();
    return succeed(result);
  });
}

export async function disconnectGoogleCalendarAction(
  connectionId: string,
): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.CALENDAR_SYNC);
    if (!isLiveMode) return fail(t('toast.failed'));
    await disconnectGoogleCalendar(connectionId);
    await refreshData('calendar');
    return succeed();
  });
}

export async function updateGoogleCalendarSettingsAction(input: {
  defaultSyncNewEvents?: boolean;
  syncDirection?: 'OUT' | 'IN' | 'BOTH';
  externalCalendarId?: string;
}): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.CALENDAR_SYNC);
    if (!isLiveMode) return fail(t('toast.failed'));
    await updateGoogleCalendarSettings(input);
    await refreshData('calendar');
    return succeed();
  });
}

export async function pullGoogleCalendarAction(input: {
  from: string;
  to: string;
}): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.CALENDAR_SYNC);
    if (!isLiveMode) return fail(t('toast.failed'));
    await pullGoogleCalendar(input);
    await refreshData('calendar');
    return succeed();
  });
}
