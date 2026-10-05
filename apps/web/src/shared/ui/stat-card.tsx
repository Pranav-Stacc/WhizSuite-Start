import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Card } from './card';
import { Sparkline } from './charts';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  delta?: number;
  hint?: string;
  spark?: number[];
  href?: string;
  invertDelta?: boolean;
  className?: string;
  compact?: boolean;
}

export function StatGrid({ children, className, cols = 4 }: { children: ReactNode; className?: string; cols?: 2 | 3 | 4 }) {
  const colClass = cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
  return <section className={cn('mb-4 grid gap-2', colClass, className)}>{children}</section>;
}

export function StatCard({ label, value, icon, delta, hint, spark, href, invertDelta, className, compact = true }: StatCardProps) {
  const positive = delta === undefined ? undefined : invertDelta ? delta <= 0 : delta >= 0;
  const body = (
    <Card hover={Boolean(href)} className={cn(compact ? 'relative h-full overflow-hidden p-3' : 'relative h-full overflow-hidden p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        {icon ? <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary [&_svg]:size-3.5">{icon}</span> : null}
      </div>
      <p className={cn('mt-1 font-semibold leading-none tracking-tight tabular-nums', compact ? 'text-xl' : 'text-[28px]')}>{value}</p>
      {(delta !== undefined || hint) ? (
        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
          {delta !== undefined ? (
            <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium', positive ? 'bg-success/14 text-success' : 'bg-danger/14 text-danger')}>
              {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta)}%
            </span>
          ) : null}
          {hint ? <span className="truncate text-muted">{hint}</span> : null}
        </div>
      ) : null}
      {spark ? <Sparkline data={spark} className="mt-2 h-8" /> : null}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
