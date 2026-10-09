'use server';

import { Permissions, themeSchema } from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { saveOrganizationTheme } from '@/shared/theme/org-theme';

/** Persists appearance for the whole organisation so new team and client logins match. */
export async function saveOrgThemeAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.ORG_BRANDING_MANAGE);
    if (!session.accessToken) return fail(t('toast.failed'));
    const parsed = parseInput(themeSchema, raw);
    if (!parsed.ok) return parsed.result;
    await saveOrganizationTheme(session.orgId, session.accessToken, parsed.data);
    await refreshData('org');
    return succeed(undefined, t('theme.savedOrg'));
  });
}
