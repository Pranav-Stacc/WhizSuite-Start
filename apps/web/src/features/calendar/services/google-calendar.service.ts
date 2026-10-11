import 'server-only';
import {
  DEFAULT_GOOGLE_CALENDAR_SYNC_TYPES,
  type GoogleCalendarConnectionDto,
} from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { getSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';

const DISABLED: GoogleCalendarConnectionDto = {
  id: 'google_calendar',
  status: 'DISABLED',
  connectionId: null,
  externalCalendarId: 'primary',
  syncDirection: 'OUT',
  defaultSyncNewEvents: false,
  syncTypes: DEFAULT_GOOGLE_CALENDAR_SYNC_TYPES,
  connectedAt: null,
  lastSyncedAt: null,
  oauthConfigured: false,
};

export async function getGoogleCalendarConnection(): Promise<GoogleCalendarConnectionDto> {
  if (!isLiveMode) return DISABLED;
  const session = await getSession();
  if (!session?.orgId) return DISABLED;
  try {
    return await apiFetch<GoogleCalendarConnectionDto>(
      orgPath(session.orgId, 'calendar/google'),
      { tags: [`org:${session.orgId}:calendar`] },
    );
  } catch {
    return DISABLED;
  }
}

export async function beginGoogleCalendarConnect(): Promise<{ authorizeUrl: string }> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('No session');
  return apiFetch<{ authorizeUrl: string }>(
    orgPath(session.orgId, 'calendar/google/connect'),
    { method: 'POST' },
  );
}

export async function disconnectGoogleCalendar(connectionId: string): Promise<void> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('No session');
  await apiFetch(orgPath(session.orgId, `calendar/google/${connectionId}/disconnect`), {
    method: 'POST',
  });
}

export async function updateGoogleCalendarSettings(input: {
  defaultSyncNewEvents?: boolean;
  syncDirection?: 'OUT' | 'IN' | 'BOTH';
  externalCalendarId?: string;
  syncTypes?: GoogleCalendarConnectionDto['syncTypes'];
}): Promise<GoogleCalendarConnectionDto> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('No session');
  return apiFetch<GoogleCalendarConnectionDto>(
    orgPath(session.orgId, 'calendar/google/settings'),
    { method: 'PATCH', body: input },
  );
}

export async function pullGoogleCalendar(input: {
  from: string;
  to: string;
}): Promise<{ imported: number }> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('No session');
  return apiFetch<{ imported: number }>(orgPath(session.orgId, 'calendar/google/pull'), {
    method: 'POST',
    body: input,
  });
}
