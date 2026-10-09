import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium uppercase tracking-[0.12em] transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'border border-primary bg-primary text-primary-contrast hover:bg-primary/85',
        soft: 'border border-border-soft bg-surface-2 text-foreground hover:border-border-strong',
        secondary: 'border border-border bg-surface text-foreground hover:border-border-strong',
        outline: 'border border-border-strong bg-transparent text-foreground hover:bg-foreground hover:text-background',
        ghost: 'text-muted hover:text-foreground',
        danger: 'border border-danger/40 text-danger hover:bg-danger hover:text-white',
        link: 'px-0 text-foreground underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-[10.5px]',
        md: 'h-9 px-4 text-[11px]',
        lg: 'h-11 px-6 text-xs',
        icon: 'size-9 tracking-normal',
        'icon-sm': 'size-8 tracking-normal',
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
