import 'server-only';
import { NotificationTypeKeys, type NotificationPreferenceDto, type NotificationTypeKey } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import type { Session } from '@/shared/auth/session-codec';
import { fetchNotificationPreferences, fetchProfile } from '../data/settings.api';
import { preferencesRepository } from '../data/preferences.repository';

export const NOTIFICATION_PREFERENCE_KEYS: readonly NotificationTypeKey[] = Object.values(NotificationTypeKeys);

export interface ProfileView {
  name: string;
  title: string;
}

const fullName = (first: string | null, last: string | null) => [first, last].filter(Boolean).join(' ');

export async function getProfile(session: Session): Promise<ProfileView> {
  if (isLiveMode) {
    const profile = await fetchProfile();
    return { name: fullName(profile.firstName, profile.lastName) || session.name, title: profile.jobTitle ?? '' };
  }
  const stored = await preferencesRepository.get(session.userId);
  return { name: stored?.displayName ?? session.name, title: stored?.title ?? '' };
}

export async function getNotificationPreferences(
  userId: string,
): Promise<Pick<NotificationPreferenceDto, 'typeKey' | 'enabled'>[]> {
  const stored: Record<string, boolean> = isLiveMode
    ? Object.fromEntries((await fetchNotificationPreferences()).map((pref) => [pref.typeKey, pref.enabled]))
    : ((await preferencesRepository.get(userId))?.notifications ?? {});
  return NOTIFICATION_PREFERENCE_KEYS.map((typeKey) => ({ typeKey, enabled: stored[typeKey] !== false }));
}
