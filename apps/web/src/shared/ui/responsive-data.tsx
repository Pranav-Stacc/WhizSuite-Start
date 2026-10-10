import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface ResponsiveDataViewProps {
  /** Desktop table (shown md+). */
  table: ReactNode;
  /** Mobile card list (shown below md). */
  cards: ReactNode;
  className?: string;
}

/** Renders a data table on md+ screens and card list on smaller viewports. */
export function ResponsiveDataView({ table, cards, className }: ResponsiveDataViewProps) {
  return (
    <div className={className}>
      <div className="hidden md:block">{table}</div>
      <ul className="space-y-3 md:hidden">{cards}</ul>
    </div>
  );
}

interface MobileDataCardProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function MobileDataCard({ href, onClick, children, className }: MobileDataCardProps) {
  const base = cn('card-surface block p-4 transition-colors hover:bg-surface-2', className);
  if (href) {
    return (
      <li>
        <Link href={href} className={base}>{children}</Link>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={onClick} className={cn(base, 'w-full text-left')}>
        {children}
      </button>
    </li>
  );
}

export function MobileDataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="shrink-0 text-xs text-muted">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export function MobileDataHeader({ title, subtitle, trailing }: { title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
