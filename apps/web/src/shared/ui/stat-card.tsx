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
}

export function StatCard({ label, value, icon, delta, hint, spark, href, invertDelta, className }: StatCardProps) {
  const positive = delta === undefined ? undefined : invertDelta ? delta <= 0 : delta >= 0;
  const body = (
    <Card hover={Boolean(href)} className={cn('relative h-full overflow-hidden p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {icon ? <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary [&_svg]:size-4">{icon}</span> : null}
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined ? (
          <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium', positive ? 'bg-success/14 text-success' : 'bg-danger/14 text-danger')}>
            {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta)}%
          </span>
        ) : null}
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
      {spark ? <Sparkline data={spark} className="mt-3" /> : null}
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
