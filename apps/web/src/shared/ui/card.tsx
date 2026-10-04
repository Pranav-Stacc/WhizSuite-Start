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
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{title}</h3>
          {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}
