import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface TabItem {
  href: string;
  label: string;
  count?: number;
  active: boolean;
  icon?: ReactNode;
}

/** Underline tabs driven by the URL — server rendered, instantly shareable. */
export function TabLinks({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav aria-label="Sections" className={cn('no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-border-soft', className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            'relative inline-flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors [&_svg]:size-4',
            item.active ? 'text-primary' : 'text-muted hover:text-foreground',
          )}
        >
          {item.icon}
          {item.label}
          {item.count !== undefined ? (
            <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', item.active ? 'bg-primary/16 text-primary' : 'bg-surface-3 text-muted')}>{item.count}</span>
          ) : null}
          {item.active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" /> : null}
        </Link>
      ))}
    </nav>
  );
}

export function FilterChips({ items, className }: { items: Array<{ href: string; label: string; active: boolean; count?: number }>; className?: string }) {
  return (
    <div className={cn('no-scrollbar flex gap-2 overflow-x-auto', className)}>
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          aria-current={item.active ? 'true' : undefined}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
            item.active ? 'border-primary/50 bg-primary/14 text-primary' : 'border-border-soft bg-surface-2 text-muted hover:border-border hover:text-foreground',
          )}
        >
          {item.label}
          {item.count !== undefined ? <span className="tabular-nums opacity-70">{item.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}

export function ViewToggle({ items }: { items: Array<{ href: string; label: string; active: boolean; icon: ReactNode }> }) {
  return (
    <div className="inline-flex rounded-lg border border-border-soft bg-surface-2 p-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          aria-label={item.label}
          aria-current={item.active ? 'true' : undefined}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors [&_svg]:size-4', item.active ? 'bg-primary/16 text-primary' : 'text-muted hover:text-foreground')}
        >
          {item.icon}
          <span className="hidden sm:inline">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

/** Builds a link that keeps the current query string and overrides selected keys. */
export function withQuery(base: string, current: Record<string, string | string[] | undefined>, overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === 'string' && value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(searchParams: SearchParams, key: string): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}
