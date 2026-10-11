import type { ReactNode } from 'react';
import { DEFAULT_THEME } from '@agency-os/contracts';
import { cn } from '@/shared/lib/cn';
import { themeToStyle } from '@/shared/theme/theme';

interface MarketingShellProps {
  children: ReactNode;
  className?: string;
  /** Full-bleed landing: pure black canvas + ambient layers (home only). */
  landing?: boolean;
}

/**
 * Public auth + marketing always render in the product default theme (mono).
 * Inline vars beat the root org-theme cookie so staff and client login look identical
 * (no agency colour wash on /login or /portal-access).
 */
const LANDING_THEME = {
  ...DEFAULT_THEME,
  bg: '#000000',
  surface: '#050505',
  border: '#1f1f1f',
};

export function MarketingShell({ children, className, landing }: MarketingShellProps) {
  return (
    <div
      className={cn(
        'marketing-shell relative min-h-dvh bg-background text-foreground',
        landing && 'overflow-x-clip',
        className,
      )}
      style={themeToStyle(landing ? LANDING_THEME : DEFAULT_THEME)}
      data-marketing="mono"
      data-theme-lock="product"
      data-landing={landing ? 'true' : undefined}
    >
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
