'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from './button';
import { Skeleton } from './feedback';

/** Shared body for every `error.tsx` boundary. */
export function RouteError({ error, reset, homeHref = '/dashboard' }: { error: Error & { digest?: string }; reset: () => void; homeHref?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-danger/12 text-danger">
        <AlertTriangle className="size-7" />
      </span>
      <h1 className="text-xl font-semibold">{t('common.error.title')}</h1>
      <p className="text-sm text-muted">{t('common.error.body')}</p>
      {error.digest ? <p className="font-mono text-xs text-muted/70">ref: {error.digest}</p> : null}
      <div className="flex gap-2">
        <Button variant="primary" onClick={reset}>
          <RotateCcw />
          {t('common.error.retry')}
        </Button>
        <Button variant="ghost" asChild>
          <Link href={homeHref}>{t('common.notFound.home')}</Link>
        </Button>
      </div>
    </div>
  );
}

/** Instant skeleton shown while a segment streams. Mirrors a typical page: header, stat row, content cards. */
export function RouteLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">{t('common.loading')}</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
