'use server';

import { updateProfileSchema } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { getPreferences, PreferenceKeys, preferencesRepository, type PreferenceKey } from '../data/preferences.repository';

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    const parsed = parseInput(updateProfileSchema, raw);
    if (!parsed.ok) return parsed.result;
    const existing = await preferencesRepository.get(session.userId);
    const base = await getPreferences(session.userId);
    const next = { ...base, displayName: parsed.data.name, title: parsed.data.title ?? '' };
    if (existing) await preferencesRepository.update(session.userId, { displayName: next.displayName, title: next.title });
    else await preferencesRepository.create(next);
    await recordAudit({
      action: 'profile.updated',
      entityType: 'user',
      entityId: session.userId,
      entityLabel: parsed.data.name,
      summary: 'Updated profile',
      diff: existing?.displayName && existing.displayName !== parsed.data.name ? { name: { from: existing.displayName, to: parsed.data.name } } : undefined,
    });
    await refreshData('settings');
    return succeed(undefined, t('settings.profile.saved'));
  });
}

export async function updatePreferenceAction(key: string, enabled: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    if (!PreferenceKeys.some((k) => k === key)) return fail(t('toast.failed'));
    const prefKey = key as PreferenceKey;
    const base = await getPreferences(session.userId);
    const existing = await preferencesRepository.get(session.userId);
    const next = { ...base, [prefKey]: enabled };
    if (existing) await preferencesRepository.update(session.userId, { [prefKey]: enabled });
    else await preferencesRepository.create(next);
    await recordAudit({
      action: 'preference.updated',
      entityType: 'preference',
      entityId: prefKey,
      entityLabel: t(`settings.pref.${prefKey}`),
      summary: `${enabled ? 'Enabled' : 'Disabled'} ${t(`settings.pref.${prefKey}`)}`,
      diff: { enabled: { from: String(!enabled), to: String(enabled) } },
    });
    await refreshData('settings', 'notifications');
    return succeed(undefined, t('settings.pref.saved'));
  });
}
