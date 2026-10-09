import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const NUMBER_PAD = 2;

/** Editorial section label, e.g. "( 03 )  CALENDAR", with an optional right-hand slot for view switches. */
export function SectionHeading({ number, title, children, className }: { number?: number; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-center justify-between gap-4', className)}>
      <h2 className="eyebrow flex items-center gap-4 !text-foreground">
        {number !== undefined ? <span className="text-muted">( {String(number).padStart(NUMBER_PAD, '0')} )</span> : null}
        {title}
      </h2>
      {children ? <div className="flex flex-wrap items-center gap-5">{children}</div> : null}
    </div>
  );
}
