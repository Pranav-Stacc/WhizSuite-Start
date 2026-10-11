'use client';

import { useCallback, useState } from 'react';
import type { SetupProgress } from '../types';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

const TOUR_KEY = 'agency-workspace-setup-tour-done';

interface SetupTourProps {
  progress: SetupProgress;
  onClose: () => void;
}

export function SetupTour({ progress, onClose }: SetupTourProps) {
  const [index, setIndex] = useState(0);

  const pending = progress.steps.filter((step) => !step.done);
  const steps = pending.length > 0 ? pending : progress.steps;

  const finish = useCallback(() => {
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch {
      /* ignore */
    }
    onClose();
  }, [onClose]);

  if (steps.length === 0) return null;

  const step = steps[index] ?? steps[0];
  const rect =
    typeof document !== 'undefined' && step.tourTarget
      ? document.querySelector(`[data-tour="${step.tourTarget}"]`)?.getBoundingClientRect()
      : undefined;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t('setup.tour.title')}>
      <div className="absolute inset-0 bg-black/45" />
      {rect ? (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent"
          style={{
            top: Math.max(8, rect.top - 4),
            left: Math.max(8, rect.left - 4),
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      ) : null}
      <div
        className={cn(
          'pointer-events-auto absolute left-4 right-4 max-w-md rounded-xl border border-border-strong bg-surface p-4 shadow-lg sm:left-auto sm:right-8',
          rect ? 'top-[min(70vh,calc(var(--spot-top,120px)))]' : 'bottom-8',
        )}
        style={rect ? ({ top: `${Math.min(window.innerHeight - 200, rect.bottom + 16)}px` } as const) : undefined}
      >
        <p className="eyebrow">{t('setup.tour.step', { current: index + 1, total: steps.length })}</p>
        <p className="mt-2 text-sm font-semibold">{t(`setup.step.${step.id}`)}</p>
        <p className="mt-1 text-[13px] text-muted">{t(`setup.step.${step.id}.body`)}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>
            {t('setup.tour.skip')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              if (index >= steps.length - 1) finish();
              else setIndex(index + 1);
            }}
          >
            {index >= steps.length - 1 ? t('setup.tour.finish') : t('setup.tour.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
