'use client';

import { useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ActionResult } from '@/shared/data/action-result';
import { t } from '@/shared/i18n/t';
import { Button, type ButtonProps } from './button';

interface ActionButtonProps {
  action: () => Promise<ActionResult<{ href?: string } | undefined>>;
  label: string;
  icon?: ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}

/** One-click mutation button: shows a spinner, toasts the outcome, follows a returned `href`. */
export function ActionButton({ action, label, icon, variant = 'secondary', size = 'md', className }: ActionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message ?? t('toast.saved'));
          if (result.data?.href) router.push(result.data.href);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : icon}
      {label}
    </Button>
  );
}
