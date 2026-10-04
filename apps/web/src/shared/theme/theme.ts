import type { CSSProperties } from 'react';
import { z } from 'zod';

export const THEME_COOKIE = 'ao_theme';
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const themeSchema = z.object({
  bg: hex,
  surface: hex,
  border: hex,
  primary: hex,
  secondary: hex,
  fg: hex,
  muted: hex,
  radius: z.number().min(4).max(28),
  density: z.enum(['comfortable', 'compact']),
});

export type ThemeSettings = z.infer<typeof themeSchema>;
export type ThemeColorKey = 'bg' | 'surface' | 'border' | 'primary' | 'secondary' | 'fg' | 'muted';

export const DEFAULT_THEME: ThemeSettings = {
  bg: '#040A09',
  surface: '#0B1513',
  border: '#193827',
  primary: '#00FF66',
  secondary: '#18E889',
  fg: '#F5F7F6',
  muted: '#8D9B98',
  radius: 14,
  density: 'comfortable',
};

export interface ThemePreset {
  id: string;
  theme: ThemeSettings;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'neon', theme: DEFAULT_THEME },
  {
    id: 'aurora',
    theme: {
      ...DEFAULT_THEME,
      bg: '#07050F',
      surface: '#110D1F',
      border: '#2C2150',
      primary: '#A78BFA',
      secondary: '#7DD3FC',
      fg: '#F6F5FF',
      muted: '#9A96B5',
    },
  },
  {
    id: 'ocean',
    theme: {
      ...DEFAULT_THEME,
      bg: '#030B12',
      surface: '#0A1823',
      border: '#17344A',
      primary: '#38BDF8',
      secondary: '#22D3EE',
      fg: '#F2F8FC',
      muted: '#8CA3B3',
    },
  },
  {
    id: 'sunset',
    theme: {
      ...DEFAULT_THEME,
      bg: '#0D0705',
      surface: '#1A100C',
      border: '#4A2A1A',
      primary: '#FF8A3D',
      secondary: '#FFC247',
      fg: '#FFF7F0',
      muted: '#B09A8A',
    },
  },
  {
    id: 'rose',
    theme: {
      ...DEFAULT_THEME,
      bg: '#0D0509',
      surface: '#1A0C13',
      border: '#4A1A2F',
      primary: '#FF4D8D',
      secondary: '#FF9AC1',
      fg: '#FFF4F8',
      muted: '#B18C9C',
    },
  },
  {
    id: 'daylight',
    theme: {
      ...DEFAULT_THEME,
      bg: '#F4F7F5',
      surface: '#FFFFFF',
      border: '#CFE0D6',
      primary: '#0A9F4F',
      secondary: '#0F7A5A',
      fg: '#0B1513',
      muted: '#5D6B67',
    },
  },
];

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: string): number {
  const n = Number.parseInt(color.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Readable text colour for content placed on top of `background`. */
export function contrastOn(background: string): string {
  return luminance(background) > 0.35 ? '#04110A' : '#FFFFFF';
}

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
    '--density': theme.density === 'compact' ? '0.86' : '1',
  };
}

export function themeToStyle(theme: ThemeSettings): CSSProperties {
  return {
    ...themeToVars(theme),
    colorScheme: luminance(theme.bg) > 0.35 ? 'light' : 'dark',
  } as CSSProperties;
}

export function parseTheme(raw: string | undefined): ThemeSettings {
  if (!raw) return DEFAULT_THEME;
  try {
    const parsed = themeSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function serializeTheme(theme: ThemeSettings): string {
  return encodeURIComponent(JSON.stringify(theme));
}
