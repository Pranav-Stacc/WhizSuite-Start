import type { ReactNode } from 'react';
import { DEFAULT_THEME } from '@agency-os/contracts';
import { cn } from '@/shared/lib/cn';
import { themeToStyle } from '@/shared/theme/theme';

interface MarketingShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Public auth + marketing always render in the product default theme (mono).
 * Inline vars beat the root org-theme cookie so staff and client login look identical
 * (no agency colour wash on /login or /portal-access).
 */
export function MarketingShell({ children, className }: MarketingShellProps) {
  return (
    <div
      className={cn('marketing-shell relative min-h-dvh bg-background text-foreground', className)}
      style={themeToStyle(DEFAULT_THEME)}
      data-marketing="mono"
      data-theme-lock="product"
    >
      {children}
    </div>
  );
}
