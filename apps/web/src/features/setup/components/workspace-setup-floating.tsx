'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Sparkles, X } from 'lucide-react';
import type { SetupProgress, SetupStepId } from '../types';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/feedback';

const DISMISS_KEY = 'agency-workspace-setup-dismissed';

const STEP_LABEL: Record<SetupStepId, MessageKey> = {
  roles: 'setup.step.roles',
  departments: 'setup.step.departments',
  client: 'setup.step.client',
  invite: 'setup.step.invite',
};

interface WorkspaceSetupFloatingProps {
  progress: SetupProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTour: () => void;
}

export function WorkspaceSetupFloating({ progress, open, onOpenChange, onStartTour }: WorkspaceSetupFloatingProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <aside
      className="fixed bottom-24 right-4 z-[60] w-[min(94vw,22rem)] rounded-xl border border-border-strong bg-surface shadow-xl lg:bottom-8 print:hidden"
      aria-labelledby="workspace-setup-floating-title"
      data-tour="setup-panel"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border-soft px-4 py-3">
        <div className="min-w-0">
          <p id="workspace-setup-floating-title" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            {t('setup.title')}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">{t('setup.floating.hint')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label={t('setup.floating.minimize')}>
            <span className="text-xs font-medium">−</span>
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={dismiss} aria-label={t('setup.dismiss')}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="px-4 py-3">
        <Progress value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0} />
        <p className="mt-1 text-[11px] text-muted">
          {t('setup.progress', { done: progress.completed, total: progress.total })}
        </p>
        <Button type="button" variant="secondary" size="sm" className="mt-3 w-full" onClick={onStartTour}>
          {t('setup.tour.start')}
        </Button>
        <ol className="mt-3 max-h-[40vh] space-y-1.5 overflow-y-auto">
          {progress.steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                data-tour={step.tourTarget}
                className={cn(
                  'flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] transition-colors hover:bg-surface-2',
                  step.done ? 'border-success/30 bg-success/5' : 'border-border-soft',
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted" />
                )}
                <span className="font-medium">{t(STEP_LABEL[step.id])}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
