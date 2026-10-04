import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

const badgeVariants = cva('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-surface-3 text-muted',
      primary: 'bg-primary/14 text-primary',
      success: 'bg-success/14 text-success',
      warning: 'bg-warning/14 text-warning',
      danger: 'bg-danger/14 text-danger',
      info: 'bg-info/14 text-info',
      violet: 'bg-violet/14 text-violet',
      pink: 'bg-pink/14 text-pink',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

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
