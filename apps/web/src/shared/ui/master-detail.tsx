'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';

interface MasterDetailLayoutProps {
  list: ReactNode;
  detail: ReactNode;
  /** When true, mobile shows detail pane and hides list. */
  showDetail: boolean;
  backHref?: string;
  backLabel?: string;
  className?: string;
  listClassName?: string;
  detailClassName?: string;
}

/** Two-pane layout: list + detail side-by-side on lg+, master/detail toggle on smaller screens. */
export function MasterDetailLayout({
  list,
  detail,
  showDetail,
  backHref,
  backLabel,
  className,
  listClassName,
  detailClassName,
}: MasterDetailLayoutProps) {
  return (
    <div className={cn('grid overflow-hidden', className)}>
      <aside className={cn(showDetail && 'hidden lg:block', listClassName)}>{list}</aside>
      <section className={cn('flex min-h-0 flex-col', !showDetail && 'hidden lg:flex', detailClassName)}>
        {showDetail && backHref ? (
          <div className="border-b border-border-soft px-3 py-2 lg:hidden">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              {backLabel ?? t('common.back')}
            </Link>
          </div>
        ) : null}
        {detail}
      </section>
    </div>
  );
}
