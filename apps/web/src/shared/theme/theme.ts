import type { CSSProperties } from 'react';
import {
  DEFAULT_THEME,
  THEME_COMPACT_DENSITY_FACTOR,
  ThemeStatusColors,
  coerceProductDefaultTheme,
  contrastOn,
  isLightColor,
  themeSchema,
  type ThemeSettings,
} from '@agency-os/contracts';

/** Bumped when the product default palette changes so existing cookies pick up DEFAULT_THEME once. */
export const THEME_COOKIE = 'ao_theme_v2';
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function themeToVars(theme: ThemeSettings): Record<string, string> {
  return {
    '--bg': theme.bg,
    '--surface': theme.surface,
    '--border': theme.border,
    '--primary': theme.primary,
    '--secondary': theme.secondary,
    '--fg': theme.fg,
    '--muted': theme.muted,
    '--primary-contrast': contrastOn(theme.primary),
    '--radius': `${theme.radius}px`,
    '--density': theme.density === 'compact' ? String(THEME_COMPACT_DENSITY_FACTOR) : '1',
    ...Object.fromEntries(Object.entries(ThemeStatusColors).map(([name, value]) => [`--status-${name}`, value])),
  };
}

export function colorScheme(theme: ThemeSettings): 'light' | 'dark' {
  return isLightColor(theme.bg) ? 'light' : 'dark';
}

export function themeToStyle(theme: ThemeSettings): CSSProperties {
  return { ...themeToVars(theme), colorScheme: colorScheme(theme) } as CSSProperties;
}

export function parseTheme(raw: string | undefined): ThemeSettings {
  if (!raw) return DEFAULT_THEME;
  try {
    const parsed = themeSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? coerceProductDefaultTheme(parsed.data) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function serializeTheme(theme: ThemeSettings): string {
  return encodeURIComponent(JSON.stringify(theme));
}
