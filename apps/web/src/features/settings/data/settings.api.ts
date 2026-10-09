import 'server-only';
import type { NotificationPreferenceDto, NotificationTypeKey, ProfileDto, ProfileUpdateInput } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { getSession } from '@/shared/auth/session';

const PROFILE_PATH = 'v1/me';
export const SETTINGS_TAG = 'settings';

async function orgId(): Promise<string> {
  return (await getSession())?.orgId ?? '';
}

export async function fetchProfile(): Promise<ProfileDto> {
  const org = await orgId();
  return apiFetch<ProfileDto>(PROFILE_PATH, { tags: [`org:${org}:${SETTINGS_TAG}`] });
}

export async function saveProfile(input: ProfileUpdateInput): Promise<ProfileDto> {
  return apiFetch<ProfileDto>(PROFILE_PATH, { method: 'PATCH', body: input });
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferenceDto[]> {
  const org = await orgId();
  return apiFetch<NotificationPreferenceDto[]>(`${orgPath(org, 'notifications')}/preferences`, { tags: [`org:${org}:${SETTINGS_TAG}`] });
}

export async function saveNotificationPreference(typeKey: NotificationTypeKey, enabled: boolean): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'notifications')}/preferences/${typeKey}`, { method: 'PUT', body: { enabled } });
}
