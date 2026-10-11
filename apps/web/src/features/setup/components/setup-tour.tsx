'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SetupProgress, SetupStep } from '../types';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

const TOUR_KEY = 'agency-workspace-setup-tour-done';
const FOCUS_CLASS = 'setup-tour-focus';

function TourScrim({ hole }: { hole: ReturnType<typeof padRect> }) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const panels = [
    { top: 0, left: 0, width: vw, height: hole.top },
    { top: hole.top, left: 0, width: hole.left, height: hole.height },
    { top: hole.top, left: hole.left + hole.width, width: vw - hole.left - hole.width, height: hole.height },
    { top: hole.top + hole.height, left: 0, width: vw, height: vh - hole.top - hole.height },
  ];
  return (
    <>
      {panels.map((p, i) =>
        p.width > 0 && p.height > 0 ? (
          <div
            key={i}
            className="pointer-events-auto fixed bg-black/55"
            style={{ top: p.top, left: p.left, width: p.width, height: p.height }}
          />
        ) : null,
      )}
    </>
  );
}

function padRect(rect: DOMRect, margin = 6) {
  return {
    top: Math.max(0, rect.top - margin),
    left: Math.max(0, rect.left - margin),
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}

function findTourElement(target: string | undefined): HTMLElement | null {
  if (!target) return null;
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

interface SetupTourProps {
  progress: SetupProgress;
  onClose: () => void;
}

export function SetupTour({ progress, onClose }: SetupTourProps) {
  const router = useRouter();
  const steps = progress.steps;
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<ReturnType<typeof padRect> | null>(null);

  const step: SetupStep = steps[index] ?? steps[0];

  const finish = useCallback(() => {
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch {
      /* ignore */
    }
    onClose();
  }, [onClose]);

  const goNext = useCallback(() => {
    if (index >= steps.length - 1) finish();
    else setIndex((i) => i + 1);
  }, [finish, index, steps.length]);

  useEffect(() => {
    if (!step?.href) return;
    router.push(step.href);
  }, [step?.href, router]);

  useEffect(() => {
    const target = step?.tourTarget;
    let activeEl: HTMLElement | null = null;

    const refresh = () => {
      if (activeEl) {
        activeEl.classList.remove(FOCUS_CLASS);
        activeEl = null;
      }
      const el = findTourElement(target);
      if (!el) {
        setSpot(null);
        return;
      }
      activeEl = el;
      el.classList.add(FOCUS_CLASS);
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setSpot(padRect(el.getBoundingClientRect()));
    };

    refresh();
    const interval = window.setInterval(refresh, 250);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);

    const onTargetClick = (event: Event) => {
      event.stopPropagation();
      goNext();
    };

    const attachClick = () => {
      const el = findTourElement(target);
      if (!el) return;
      el.addEventListener('click', onTargetClick, { once: true });
    };
    const clickTimer = window.setTimeout(attachClick, 400);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(clickTimer);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      if (activeEl) activeEl.classList.remove(FOCUS_CLASS);
      const el = findTourElement(target);
      el?.removeEventListener('click', onTargetClick);
    };
  }, [step?.tourTarget, goNext]);

  if (steps.length === 0) return null;

  const hole = spot;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t('setup.tour.title')}>
      {hole ? <TourScrim hole={hole} /> : <div className="absolute inset-0 bg-black/55" />}
      {hole ? (
        <div
          className="pointer-events-none absolute rounded-[10px] ring-2 ring-primary ring-offset-2 ring-offset-transparent"
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        />
      ) : null}
      <div
        className={cn(
          'pointer-events-auto absolute left-4 right-4 max-w-md rounded-xl border border-border-strong bg-surface p-4 shadow-lg sm:left-auto sm:right-8',
          hole ? '' : 'bottom-8',
        )}
        style={
          hole
            ? {
                top:
                  typeof window !== 'undefined'
                    ? Math.min(window.innerHeight - 220, hole.top + hole.height + 16)
                    : hole.top + hole.height + 16,
                right: 32,
                left: 'auto',
              }
            : undefined
        }
      >
        <p className="eyebrow">{t('setup.tour.step', { current: index + 1, total: steps.length })}</p>
        <p className="mt-2 text-sm font-semibold">{t(`setup.step.${step.id}`)}</p>
        <p className="mt-1 text-[13px] text-muted">{t(`setup.step.${step.id}.body`)}</p>
        <p className="mt-2 text-[12px] font-medium text-primary">{t('setup.tour.clickHint')}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>
            {t('setup.tour.skip')}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={goNext}>
            {index >= steps.length - 1 ? t('setup.tour.finish') : t('setup.tour.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
