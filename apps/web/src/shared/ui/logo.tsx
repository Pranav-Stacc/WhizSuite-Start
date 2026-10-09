import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('relative inline-grid size-7 shrink-0 place-items-center bg-foreground text-background', className)}>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M4 18 12 5l8 13" />
        <path d="M8 18h8" />
      </svg>
    </span>
  );
}

/** Editorial wordmark. `name` lets the agency's own brand replace the product name. */
export function Logo({ className, compact = false, name }: { className?: string; compact?: boolean; name?: string }) {
  if (compact) return <LogoMark className={className} />;
  return <span className={cn('wordmark inline-block truncate', className)}>{name ?? t('app.name')}</span>;
}
