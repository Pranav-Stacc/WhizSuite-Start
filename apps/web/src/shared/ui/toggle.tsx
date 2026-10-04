'use client';

import { useOptimistic, useTransition } from 'react';
import { Switch } from 'radix-ui';
import { toast } from 'sonner';
import type { ActionResult } from '@/shared/data/action-result';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';

interface ToggleProps {
  checked: boolean;
  label: string;
  /** Server action invoked with the new value; UI updates optimistically. */
  action?: (checked: boolean) => Promise<ActionResult | void>;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, label, action, disabled, className }: ToggleProps) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [, startTransition] = useTransition();
  return (
    <Switch.Root
      checked={optimistic}
      disabled={disabled}
      aria-label={label}
      onCheckedChange={(next) =>
        startTransition(async () => {
          setOptimistic(next);
          try {
            const result = await action?.(next);
            if (result) {
              if (result.ok) toast.success(result.message ?? t('toast.saved'));
              else toast.error(result.message);
            }
          } catch {
            toast.error(t('toast.failed'));
          }
        })
      }
      className={cn(
        'relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-border bg-surface-3 transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50',
        className,
      )}
    >
      <Switch.Thumb className="block size-4.5 translate-x-0.5 rounded-full bg-foreground shadow transition-transform data-[state=checked]:translate-x-5.5 data-[state=checked]:bg-primary-contrast" />
    </Switch.Root>
  );
}
