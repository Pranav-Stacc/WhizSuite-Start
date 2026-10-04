import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-contrast shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_60%,transparent),0_6px_24px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:brightness-110',
        soft: 'bg-primary/12 text-primary hover:bg-primary/20',
        secondary: 'border border-border-soft bg-surface-2 text-foreground hover:bg-surface-3 hover:border-border',
        outline: 'border border-border text-foreground hover:bg-surface-2',
        ghost: 'text-muted hover:bg-surface-2 hover:text-foreground',
        danger: 'bg-danger/12 text-danger hover:bg-danger/20',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
