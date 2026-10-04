'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ActionResult } from '@/shared/data/action-result';
import { t } from '@/shared/i18n/t';
import { Button, type ButtonProps } from './button';

const CONFIRM_WINDOW_MS = 3500;

interface ConfirmButtonProps {
  action: () => Promise<ActionResult>;
  label: string;
  icon?: ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  /** Navigate here after a successful action. */
  redirectTo?: string;
  className?: string;
}

/** Two-step destructive button: first click arms it, second click within a few seconds confirms. No modal-on-modal. */
export function ConfirmButton({ action, label, icon, variant = 'danger', size = 'md', redirectTo, className }: ConfirmButtonProps) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      type="button"
      variant={armed ? 'danger' : variant === 'danger' ? 'ghost' : variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        startTransition(async () => {
          const result = await action();
          setArmed(false);
          if (result.ok) {
            toast.success(result.message ?? t('toast.deleted'));
            if (redirectTo) router.push(redirectTo);
          } else toast.error(result.message);
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : (icon ?? <Trash2 />)}
      {armed ? t('common.confirmAgain') : label}
    </Button>
  );
}
