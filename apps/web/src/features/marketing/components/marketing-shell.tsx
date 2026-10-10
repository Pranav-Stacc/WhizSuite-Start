import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** Noir monochrome locked for public marketing surfaces, independent of the in-app theme cookie. */
const MARKETING_THEME = {
  '--bg': '#0E0E0D',
  '--surface': '#161615',
  '--border': '#2E2D2A',
  '--primary': '#F2F0EB',
  '--secondary': '#B8B5AE',
  '--fg': '#F2F0EB',
  '--muted': '#8C8A85',
  '--primary-contrast': '#0E0E0D',
  '--radius': '2px',
  '--density': '1',
  '--status-success': '#4F8A65',
  '--status-warning': '#C08A3E',
  '--status-danger': '#BF5148',
  '--status-info': '#5A7FAE',
  '--status-violet': '#8A7AB4',
  '--status-pink': '#BE7896',
} as React.CSSProperties;

interface MarketingShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Public auth + marketing always render in product Noir.
 * Inline vars beat the root org-theme cookie so staff and client login look identical
 * to the original product chrome (no agency colour wash on /login or /portal-access).
 */
export function MarketingShell({ children, className }: MarketingShellProps) {
  return (
    <div
      className={cn('marketing-shell relative min-h-dvh bg-background text-foreground', className)}
      style={MARKETING_THEME}
      data-marketing="noir"
      data-theme-lock="product"
    >
      {children}
    </div>
  );
}
