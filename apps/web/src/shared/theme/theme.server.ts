import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { THEME_COOKIE, parseTheme, type ThemeSettings } from './theme';

export const getTheme = cache(async (): Promise<ThemeSettings> => parseTheme((await cookies()).get(THEME_COOKIE)?.value));
