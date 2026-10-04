import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('relative inline-grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-contrast shadow-[0_0_24px_-4px_var(--primary)]', className)}
    >
      <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18 12 5l8 13" />
        <path d="M8 18h8" />
      </svg>
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {compact ? null : <span className="text-[15px] font-semibold tracking-tight">{t('app.name')}</span>}
    </span>
  );
}
