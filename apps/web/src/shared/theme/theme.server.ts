import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { ThemeSettings } from '@agency-os/contracts';
import { THEME_COOKIE, parseTheme } from './theme';

export const getTheme = cache(async (): Promise<ThemeSettings> => parseTheme((await cookies()).get(THEME_COOKIE)?.value));
