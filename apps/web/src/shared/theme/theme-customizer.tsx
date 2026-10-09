'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, Palette, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Sheet, Tooltip } from '@/shared/ui/overlays';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  THEME_RADIUS_MAX,
  THEME_RADIUS_MIN,
  ThemeDensities,
  type ThemeColorKey,
  type ThemePreset,
  type ThemeSettings,
} from '@agency-os/contracts';
import { saveOrgThemeAction } from '@/features/settings/actions/theme.actions';
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, colorScheme, serializeTheme, themeToVars } from './theme';

const COLOR_FIELDS: Array<{ key: ThemeColorKey; label: MessageKey }> = [
  { key: 'primary', label: 'theme.color.primary' },
  { key: 'secondary', label: 'theme.color.secondary' },
  { key: 'bg', label: 'theme.color.bg' },
  { key: 'surface', label: 'theme.color.surface' },
  { key: 'border', label: 'theme.color.border' },
  { key: 'fg', label: 'theme.color.fg' },
  { key: 'muted', label: 'theme.color.muted' },
];

function applyTheme(theme: ThemeSettings): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(themeToVars(theme))) root.style.setProperty(name, value);
  root.style.colorScheme = colorScheme(theme);
  document.cookie = `${THEME_COOKIE}=${serializeTheme(theme)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
}

function same(a: ThemeSettings, b: ThemeSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function PresetGrid({
  presets,
  theme,
  onSelect,
}: {
  presets: ThemePreset[];
  theme: ThemeSettings;
  onSelect: (preset: ThemePreset) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {presets.map((preset) => {
        const active = same(preset.theme, theme);
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            aria-pressed={active}
            className={cn(
              'group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all',
              active ? 'border-primary ring-2 ring-primary/30' : 'border-border-soft hover:border-border',
            )}
            style={{ background: preset.theme.bg }}
          >
            <span className="mb-2 flex gap-1">
              <span className="size-4 rounded-full" style={{ background: preset.theme.primary }} />
              <span className="size-4 rounded-full" style={{ background: preset.theme.secondary }} />
              <span className="size-4 rounded-full border" style={{ background: preset.theme.surface, borderColor: preset.theme.border }} />
            </span>
            <span className="block text-xs font-medium" style={{ color: preset.theme.fg }}>
              {t(`theme.preset.${preset.id}` as MessageKey)}
            </span>
            {active ? <Check className="absolute right-2 top-2 size-3.5" style={{ color: preset.theme.primary }} /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Live theme editor. Preview locally, then save for the whole organisation when permitted. */
export function ThemeCustomizer({
  initial,
  trigger,
  canSaveOrg = false,
}: {
  initial: ThemeSettings;
  trigger?: 'icon' | 'button';
  canSaveOrg?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(initial);
  const [pending, startTransition] = useTransition();

  const lightPresets = useMemo(() => THEME_PRESETS.filter((p) => p.mode === 'light'), []);
  const darkPresets = useMemo(() => THEME_PRESETS.filter((p) => p.mode === 'dark'), []);

  const update = (patch: Partial<ThemeSettings>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    applyTheme(next);
  };

  const selectPreset = (preset: ThemePreset) => {
    setTheme(preset.theme);
    applyTheme(preset.theme);
  };

  return (
    <>
      <Tooltip content={t('shell.theme')}>
        <Button variant={trigger === 'button' ? 'secondary' : 'ghost'} size={trigger === 'button' ? 'md' : 'icon'} onClick={() => setOpen(true)} aria-label={t('shell.theme')}>
          <Palette />
          {trigger === 'button' ? t('shell.theme') : null}
        </Button>
      </Tooltip>
      <Sheet open={open} onOpenChange={setOpen} title={t('theme.title')} description={t('theme.description')} width="max-w-md">
        <div className="space-y-7">
          <section aria-labelledby="theme-presets">
            <h3 id="theme-presets" className="mb-3 text-sm font-semibold">
              {t('theme.presets')}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="eyebrow mb-2">{t('theme.presets.light')}</p>
                <PresetGrid presets={lightPresets} theme={theme} onSelect={selectPreset} />
              </div>
              <div>
                <p className="eyebrow mb-2">{t('theme.presets.dark')}</p>
                <PresetGrid presets={darkPresets} theme={theme} onSelect={selectPreset} />
              </div>
            </div>
          </section>

          <section aria-labelledby="theme-colors">
            <h3 id="theme-colors" className="mb-3 text-sm font-semibold">
              {t('theme.colors')}
            </h3>
            <ul className="space-y-2">
              {COLOR_FIELDS.map(({ key, label }) => (
                <li key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <label htmlFor={`theme-${key}`} className="text-sm">
                    {t(label)}
                  </label>
                  <span className="flex items-center gap-2">
                    <code className="font-mono text-xs uppercase text-muted">{theme[key]}</code>
                    <input id={`theme-${key}`} type="color" value={theme[key]} onChange={(e) => update({ [key]: e.target.value } as Partial<ThemeSettings>)} className="size-8" />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="theme-shape" className="space-y-4">
            <h3 id="theme-shape" className="text-sm font-semibold">
              {t('theme.shape')}
            </h3>
            <div>
              <label htmlFor="theme-radius" className="mb-2 flex items-center justify-between text-sm">
                {t('theme.radius')}
                <span className="font-mono text-xs text-muted">{theme.radius}px</span>
              </label>
              <input id="theme-radius" type="range" min={THEME_RADIUS_MIN} max={THEME_RADIUS_MAX} value={theme.radius} onChange={(e) => update({ radius: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
            </div>
            <div>
              <p className="mb-2 text-sm">{t('theme.density')}</p>
              <div className="inline-flex rounded-lg border border-border-soft bg-surface-2 p-0.5">
                {ThemeDensities.map((density) => (
                  <button
                    key={density}
                    type="button"
                    aria-pressed={theme.density === density}
                    onClick={() => update({ density })}
                    className={cn('rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors', theme.density === density ? 'bg-primary/16 text-primary' : 'text-muted hover:text-foreground')}
                  >
                    {t(density === 'compact' ? 'theme.density.compact' : 'theme.density.comfortable')}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {canSaveOrg ? (
              <Button
                variant="primary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await saveOrgThemeAction(theme);
                    if (result.ok) toast.success(result.message);
                    else toast.error(result.message);
                  })
                }
              >
                {t('theme.saveOrg')}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                setTheme(DEFAULT_THEME);
                applyTheme(DEFAULT_THEME);
              }}
            >
              <RotateCcw />
              {t('theme.reset')}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
