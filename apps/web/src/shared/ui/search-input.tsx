'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';

const DEBOUNCE_MS = 220;

/** URL-driven search box: typing updates ?q= so the server component re-renders filtered results. */
export function SearchInput({ placeholder, className }: { placeholder?: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const push = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set('q', next);
    else sp.delete('q');
    startTransition(() => router.replace(sp.size ? `${pathname}?${sp.toString()}` : pathname, { scroll: false }));
  };

  return (
    <div className={cn('relative w-full max-w-xs', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => push(e.target.value), DEBOUNCE_MS);
        }}
        placeholder={placeholder ?? t('common.search')}
        aria-label={placeholder ?? t('common.search')}
        className={cn(
          'h-10 w-full rounded-lg border border-border-soft bg-surface-2 pl-9 pr-9 text-sm placeholder:text-muted/70 hover:border-border focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          pending && 'opacity-80',
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label={t('common.clearFilters')}
          onClick={() => {
            setValue('');
            push('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
