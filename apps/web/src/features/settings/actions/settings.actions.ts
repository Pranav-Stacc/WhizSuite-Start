'use server';

import { updateProfileSchema } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import { requireSession, startSession } from '@/shared/auth/session';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t, type MessageKey } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { preferencesRepository, type Preferences } from '../data/preferences.repository';
import { SETTINGS_TAG, saveNotificationPreference, saveProfile } from '../data/settings.api';
import { NOTIFICATION_PREFERENCE_KEYS } from '../services/settings.service';

async function saveDemoPreferences(userId: string, patch: Partial<Preferences>): Promise<Preferences | undefined> {
  const existing = await preferencesRepository.get(userId);
  if (existing) await preferencesRepository.update(userId, patch);
  else await preferencesRepository.create({ id: userId, notifications: {}, ...patch });
  return existing;
}

/** Splits "Asha Rao Menon" into first name "Asha" and last name "Rao Menon". */
function splitName(name: string): { firstName: string; lastName: string | null } {
  const [firstName = name, ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') || null };
}

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    const parsed = parseInput(updateProfileSchema, raw);
    if (!parsed.ok) return parsed.result;
    const { name, title } = parsed.data;
    if (isLiveMode) {
      await saveProfile({ ...splitName(name), jobTitle: title ?? null });
    } else {
      const before = await saveDemoPreferences(session.userId, { displayName: name, title: title ?? '' });
      await recordAudit({
        action: 'profile.updated',
        entityType: 'user',
        entityId: session.userId,
        entityLabel: name,
        summary: 'Updated profile',
        diff: before?.displayName && before.displayName !== name ? { name: { from: before.displayName, to: name } } : undefined,
      });
    }
    if (name !== session.name) await startSession({ ...session, name });
    await refreshData(SETTINGS_TAG, 'team');
    return succeed(undefined, t('settings.profile.saved'));
  });
}

export async function updatePreferenceAction(key: string, enabled: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    const typeKey = NOTIFICATION_PREFERENCE_KEYS.find((k) => k === key);
    if (!typeKey) return fail(t('toast.failed'));
    if (isLiveMode) {
      await saveNotificationPreference(typeKey, enabled);
    } else {
      const current = (await preferencesRepository.get(session.userId))?.notifications ?? {};
      await saveDemoPreferences(session.userId, { notifications: { ...current, [typeKey]: enabled } });
      const label = t(`settings.pref.${typeKey}` as MessageKey);
      await recordAudit({
        action: 'preference.updated',
        entityType: 'preference',
        entityId: typeKey,
        entityLabel: label,
        summary: `${enabled ? 'Enabled' : 'Disabled'} ${label}`,
        diff: { enabled: { from: String(!enabled), to: String(enabled) } },
      });
    }
    await refreshData(SETTINGS_TAG, 'notifications');
    return succeed(undefined, t('settings.pref.saved'));
  });
}
