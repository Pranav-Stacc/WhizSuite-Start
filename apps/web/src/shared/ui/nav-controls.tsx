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
    <nav aria-label="Sections" className={cn('no-scrollbar mb-8 flex gap-6 overflow-x-auto', className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className="nav-link inline-flex shrink-0 items-center gap-1.5 py-1 [&_svg]:size-3.5"
        >
          {item.icon}
          {item.label}
          {item.count !== undefined ? <span className="tabular-nums opacity-60">· {item.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function FilterChips({ items, className }: { items: Array<{ href: string; label: string; active: boolean; count?: number }>; className?: string }) {
  return (
    <div className={cn('no-scrollbar flex items-center gap-1 overflow-x-auto', className)}>
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          aria-current={item.active ? 'true' : undefined}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.14em] transition-colors',
            item.active ? 'border-foreground text-foreground' : 'border-transparent text-muted hover:text-foreground',
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
    <div className="inline-flex items-center gap-5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          aria-label={item.label}
          aria-current={item.active ? 'true' : undefined}
          className="nav-link inline-flex h-8 items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:sm:hidden"
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
