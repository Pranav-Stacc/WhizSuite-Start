import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function Card({ className, hover = false, ...props }: ComponentProps<'div'> & { hover?: boolean }) {
  return <div className={cn('card-surface', hover && 'card-hover', className)} {...props} />;
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, icon, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-border-soft px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-px shrink-0 text-muted [&_svg]:size-3.5">{icon}</span> : null}
        <div className="min-w-0">
          <h3 className="eyebrow truncate !text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}
