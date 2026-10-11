import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="eyebrow mb-2 sm:mb-3" suppressHydrationWarning>
            {eyebrow}
          </div>
        ) : null}
        <h1 className="display text-[1.5rem] leading-tight sm:text-[28px] lg:text-[34px]" suppressHydrationWarning>
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[13px] text-muted" suppressHydrationWarning>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
    </header>
  );
}
