import { z } from 'zod';

/** Appearance settings shared by every client (web, mobile). Stored per device. */
export const THEME_RADIUS_MIN = 0;
export const THEME_RADIUS_MAX = 28;
export const ThemeDensities = ['comfortable', 'compact'] as const;
export type ThemeDensity = (typeof ThemeDensities)[number];

/** Spacing multiplier applied in compact density. */
export const THEME_COMPACT_DENSITY_FACTOR = 0.86;
/** Backgrounds brighter than this relative luminance get dark foreground text. */
export const THEME_LIGHT_LUMINANCE_THRESHOLD = 0.35;
export const THEME_CONTRAST_DARK = '#04110A';
export const THEME_CONTRAST_LIGHT = '#FFFFFF';

/** Semantic status colours; muted so they sit on every preset without fighting the palette. */
export const ThemeStatusColors = {
  success: '#4F8A65',
  warning: '#C08A3E',
  danger: '#BF5148',
  info: '#5A7FAE',
  violet: '#8A7AB4',
  pink: '#BE7896',
} as const;
export type ThemeStatusColor = keyof typeof ThemeStatusColors;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const themeSchema = z.object({
  bg: hex,
  surface: hex,
  border: hex,
  primary: hex,
  secondary: hex,
  fg: hex,
  muted: hex,
  radius: z.number().min(THEME_RADIUS_MIN).max(THEME_RADIUS_MAX),
  density: z.enum(ThemeDensities),
});

export type ThemeSettings = z.infer<typeof themeSchema>;
export const ThemeColorKeys = ['primary', 'secondary', 'bg', 'surface', 'border', 'fg', 'muted'] as const;
export type ThemeColorKey = (typeof ThemeColorKeys)[number];

/** Editorial monochrome: off-white paper, ink text, hairline rules, square corners. */
export const DEFAULT_THEME: ThemeSettings = {
  bg: '#F7F6F3',
  surface: '#FFFFFF',
  border: '#D8D5CE',
  primary: '#111111',
  secondary: '#5C5A55',
  fg: '#111111',
  muted: '#8A877F',
  radius: 2,
  density: 'comfortable',
};

const NOIR_THEME: ThemeSettings = {
  bg: '#0E0E0D',
  surface: '#161615',
  border: '#2E2D2A',
  primary: '#F2F0EB',
  secondary: '#B8B5AE',
  fg: '#F2F0EB',
  muted: '#8C8A85',
  radius: 2,
  density: 'comfortable',
};

/** The original dark, rounded look — kept as a preset. */
const MONO_THEME: ThemeSettings = {
  bg: '#040109',
  surface: '#0B0B0B',
  border: '#2A2A2A',
  primary: '#FFFFFF',
  secondary: '#D1D1D1',
  fg: '#FFFFFF',
  muted: '#8D9B98',
  radius: 14,
  density: 'comfortable',
};

export interface ThemePreset {
  id: string;
  /** light | dark — used to group presets in appearance pickers. */
  mode: 'light' | 'dark';
  theme: ThemeSettings;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'editorial', mode: 'light', theme: DEFAULT_THEME },
  {
    id: 'chalk',
    mode: 'light',
    theme: {
      bg: '#F4F4F5',
      surface: '#FFFFFF',
      border: '#D4D4D8',
      primary: '#18181B',
      secondary: '#52525B',
      fg: '#18181B',
      muted: '#71717A',
      radius: 4,
      density: 'comfortable',
    },
  },
  {
    id: 'porcelain',
    mode: 'light',
    theme: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      border: '#D0D7E2',
      primary: '#0F172A',
      secondary: '#334155',
      fg: '#0F172A',
      muted: '#64748B',
      radius: 6,
      density: 'comfortable',
    },
  },
  {
    id: 'mist',
    mode: 'light',
    theme: {
      bg: '#F0F4F8',
      surface: '#FFFFFF',
      border: '#C5D4E0',
      primary: '#1E3A5F',
      secondary: '#3D6B8F',
      fg: '#152536',
      muted: '#5E7388',
      radius: 6,
      density: 'comfortable',
    },
  },
  {
    id: 'daylight',
    mode: 'light',
    theme: {
      bg: '#F4F7F5',
      surface: '#FFFFFF',
      border: '#CFE0D6',
      primary: '#0A9F4F',
      secondary: '#0F7A5A',
      fg: '#0B1513',
      muted: '#5D6B67',
      radius: 14,
      density: 'comfortable',
    },
  },
  {
    id: 'sage',
    mode: 'light',
    theme: {
      bg: '#F3F5F1',
      surface: '#FBFCF9',
      border: '#CDD5C8',
      primary: '#3F5A45',
      secondary: '#6B8570',
      fg: '#1C241E',
      muted: '#6E7A70',
      radius: 8,
      density: 'comfortable',
    },
  },
  {
    id: 'sky',
    mode: 'light',
    theme: {
      bg: '#F3F8FC',
      surface: '#FFFFFF',
      border: '#C5D9EB',
      primary: '#0369A1',
      secondary: '#0E7490',
      fg: '#0C1929',
      muted: '#5B738A',
      radius: 10,
      density: 'comfortable',
    },
  },
  {
    id: 'linen',
    mode: 'light',
    theme: {
      bg: '#F6F3EE',
      surface: '#FFFDF9',
      border: '#DDD5C8',
      primary: '#2C2A26',
      secondary: '#6B6560',
      fg: '#1F1D1A',
      muted: '#7A746C',
      radius: 2,
      density: 'comfortable',
    },
  },
  { id: 'noir', mode: 'dark', theme: NOIR_THEME },
  { id: 'mono', mode: 'dark', theme: MONO_THEME },
  {
    id: 'aurora',
    mode: 'dark',
    theme: {
      ...MONO_THEME,
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
    mode: 'dark',
    theme: {
      ...MONO_THEME,
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
    mode: 'dark',
    theme: {
      ...MONO_THEME,
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
    mode: 'dark',
    theme: {
      ...MONO_THEME,
      bg: '#0D0509',
      surface: '#1A0C13',
      border: '#4A1A2F',
      primary: '#FF4D8D',
      secondary: '#FF9AC1',
      fg: '#FFF4F8',
      muted: '#B18C9C',
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

export function isLightColor(color: string): boolean {
  return luminance(color) > THEME_LIGHT_LUMINANCE_THRESHOLD;
}

/** Readable text colour for content placed on top of `background`. */
export function contrastOn(background: string): string {
  return isLightColor(background) ? THEME_CONTRAST_DARK : THEME_CONTRAST_LIGHT;
}
