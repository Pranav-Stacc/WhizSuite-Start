import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.12em]',
  {
    variants: {
      tone: {
        neutral: 'border-border text-muted',
        primary: 'border-foreground/70 text-foreground',
        success: 'border-success/40 text-success',
        warning: 'border-warning/45 text-warning',
        danger: 'border-danger/40 text-danger',
        info: 'border-info/40 text-info',
        violet: 'border-violet/40 text-violet',
        pink: 'border-pink/40 text-pink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export function Badge({
  className,
  tone,
  dot,
  children,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
