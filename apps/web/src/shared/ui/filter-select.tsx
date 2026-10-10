'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/shared/lib/cn';
import { Select } from './field';

interface FilterSelectProps {
  /** Query-string key this control owns. */
  name: string;
  value?: string;
  allLabel: string;
  options: Array<{ value: string; label: string }>;
  label: string;
  className?: string;
}

/** URL-driven dropdown filter: changing it updates the query string and the server re-renders. */
export function FilterSelect({ name, value, allLabel, options, label, className }: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      aria-label={label}
      value={value ?? ''}
      className={cn('h-9 w-full min-w-0 max-w-full text-[13px] sm:w-auto sm:min-w-40', pending && 'opacity-70', className)}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set(name, e.target.value);
        else next.delete(name);
        startTransition(() => router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, { scroll: false }));
      }}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
