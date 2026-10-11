'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Sparkles, X } from 'lucide-react';
import type { SetupProgress, SetupStepId } from '../types';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/feedback';

const STORAGE_KEY = 'agency-workspace-setup-dismissed';

const STEP_LABEL: Record<SetupStepId, MessageKey> = {
  roles: 'setup.step.roles',
  departments: 'setup.step.departments',
  client: 'setup.step.client',
  invite: 'setup.step.invite',
};

interface WorkspaceSetupPanelProps {
  progress: SetupProgress;
  onStartTour?: () => void;
}

export function WorkspaceSetupPanel({ progress, onStartTour }: WorkspaceSetupPanelProps) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === '1' || progress.complete);
    } catch {
      setHidden(progress.complete);
    }
  }, [progress.complete]);

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <section
      className="mb-8 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-surface to-surface p-5 sm:p-6"
      aria-labelledby="workspace-setup-title"
      data-tour="setup-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="workspace-setup-title" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            {t('setup.title')}
          </p>
          <p className="mt-1 max-w-2xl text-[13px] text-muted">{t('setup.desc')}</p>
          <div className="mt-4 max-w-md">
            <Progress value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0} />
            <p className="mt-1.5 text-[11px] text-muted">
              {t('setup.progress', { done: progress.completed, total: progress.total })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onStartTour ? (
            <Button type="button" variant="secondary" size="sm" onClick={onStartTour}>
              {t('setup.tour.start')}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="icon-sm" onClick={dismiss} aria-label={t('setup.dismiss')}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {progress.steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              data-tour={step.tourTarget}
              className={cn(
                'flex h-full items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] transition-colors hover:bg-surface-2',
                step.done ? 'border-success/30 bg-success/5' : 'border-border-soft bg-surface/80',
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
    </section>
  );
}
