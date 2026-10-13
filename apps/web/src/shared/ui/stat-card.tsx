import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { WorkspaceModule } from '@/shared/workspace/modules';
import { ModuleLink } from '@/shared/workspace/module-link';
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
  /** Required with href when APP_ROOT_DOMAIN splits CRM/Finance hosts. */
  workspaceModule?: WorkspaceModule;
  orgSlug?: string;
  invertDelta?: boolean;
  className?: string;
  compact?: boolean;
}

export function StatGrid({ children, className, cols = 4 }: { children: ReactNode; className?: string; cols?: 2 | 3 | 4 }) {
  const colClass = cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';
  return (
    <section
      className={cn(
        'mb-4 grid max-w-4xl gap-px overflow-hidden rounded-lg border border-border-soft bg-border-soft [&>*>*]:rounded-none [&>*]:rounded-none [&>*]:border-0 [&_.card-surface]:border-0',
        colClass,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  hint,
  spark,
  href,
  workspaceModule = 'main',
  orgSlug,
  invertDelta,
  className,
  compact = true,
}: StatCardProps) {
  const positive = delta === undefined ? undefined : invertDelta ? delta <= 0 : delta >= 0;
  const body = (
    <Card hover={Boolean(href)} className={cn(compact ? 'relative h-full overflow-hidden p-3' : 'relative h-full overflow-hidden p-6', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
        {icon ? <span className="shrink-0 text-muted [&_svg]:size-3">{icon}</span> : null}
      </div>
      <p className={cn('mt-1.5 font-semibold tabular-nums tracking-tight', compact ? 'text-lg' : 'text-[36px]')}>{value}</p>
      {delta !== undefined || hint ? (
        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
          {delta !== undefined ? (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', positive ? 'text-success' : 'text-danger')}>
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
    <ModuleLink href={href} currentModule={workspaceModule} orgSlug={orgSlug} className="block h-full">
      {body}
    </ModuleLink>
  ) : (
    body
  );
}
