import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_THEME, coerceProductDefaultTheme, themeSchema, type ThemeSettings } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { isLiveMode } from '@/shared/config/env';
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, serializeTheme } from './theme';

/** Fetches the agency theme and writes it to the shared cookie so every member sees the same colours. */
export async function applyOrganizationTheme(input: {
  orgId: string;
  accessToken: string;
}): Promise<ThemeSettings> {
  if (!isLiveMode || !input.orgId || !input.accessToken) return DEFAULT_THEME;
  try {
    const response = await apiFetch<{ theme: ThemeSettings }>(orgPath(input.orgId, 'theme'), {
      token: input.accessToken,
      organizationId: input.orgId,
    });
    const parsed = themeSchema.safeParse(response.theme);
    const theme = coerceProductDefaultTheme(parsed.success ? parsed.data : DEFAULT_THEME);
    const store = await cookies();
    store.set(THEME_COOKIE, serializeTheme(theme), {
      path: '/',
      maxAge: THEME_COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: false,
    });
    return theme;
  } catch {
    return DEFAULT_THEME;
  }
}

export async function saveOrganizationTheme(
  orgId: string,
  accessToken: string,
  theme: ThemeSettings,
): Promise<ThemeSettings> {
  const response = await apiFetch<{ theme: ThemeSettings }>(orgPath(orgId, 'theme'), {
    method: 'PATCH',
    token: accessToken,
    organizationId: orgId,
    body: theme,
  });
  const store = await cookies();
  store.set(THEME_COOKIE, serializeTheme(response.theme), {
    path: '/',
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false,
  });
  return response.theme;
}
