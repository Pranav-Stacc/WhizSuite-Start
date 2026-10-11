'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { SetupProgress } from '../types';
import { SetupTour } from './setup-tour';
import { WorkspaceSetupFloating } from './workspace-setup-floating';
import { WorkspaceSetupIntroDialog } from './workspace-setup-intro-dialog';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';

const INTRO_SEEN_KEY = 'agency-workspace-setup-intro-seen';

interface WorkspaceSetupJourneyProps {
  progress: SetupProgress | null;
}

/** Onboarding checklist + interactive tour — persists across staff routes until complete or dismissed. */
export function WorkspaceSetupJourney({ progress }: WorkspaceSetupJourneyProps) {
  const [introOpen, setIntroOpen] = useState(false);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (!progress || progress.complete) return;
    try {
      if (localStorage.getItem(INTRO_SEEN_KEY) === '1') {
        setFloatingOpen(true);
        return;
      }
      setIntroOpen(true);
    } catch {
      setIntroOpen(true);
    }
  }, [progress]);

  const markIntroSeen = useCallback(() => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setIntroOpen(false);
    setFloatingOpen(true);
  }, []);

  const startTour = useCallback(() => {
    markIntroSeen();
    setFloatingOpen(false);
    setTourOpen(true);
  }, [markIntroSeen]);

  if (!progress || progress.complete) return null;

  return (
    <>
      <WorkspaceSetupIntroDialog
        open={introOpen}
        progress={progress}
        onOpenChange={(open) => {
          if (!open) markIntroSeen();
          else setIntroOpen(true);
        }}
        onStartTour={startTour}
        onShowChecklist={() => markIntroSeen()}
      />
      <WorkspaceSetupFloating
        progress={progress}
        open={floatingOpen}
        onOpenChange={setFloatingOpen}
        onStartTour={() => setTourOpen(true)}
      />
      {!floatingOpen && !introOpen && !tourOpen ? (
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={cn(
            'fixed bottom-24 right-4 z-50 gap-2 shadow-lg lg:bottom-8',
            'print:hidden',
          )}
          onClick={() => setFloatingOpen(true)}
          aria-label={t('setup.floating.open')}
        >
          <Sparkles className="size-4" />
          {t('setup.floating.resume')}
        </Button>
      ) : null}
      {tourOpen ? <SetupTour progress={progress} onClose={() => setTourOpen(false)} /> : null}
    </>
  );
}
