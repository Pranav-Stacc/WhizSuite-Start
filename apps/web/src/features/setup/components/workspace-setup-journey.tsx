'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { SetupProgress } from '../types';
import { dismissSetupIntro, isSetupIntroDismissed } from '../utils/setup-storage';
import { SetupTour } from './setup-tour';
import { WorkspaceSetupFloating } from './workspace-setup-floating';
import { WorkspaceSetupIntroDialog } from './workspace-setup-intro-dialog';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';

interface WorkspaceSetupJourneyProps {
  progress: SetupProgress | null;
  orgId: string;
}

/** Onboarding checklist + interactive tour — intro shows once; resume via floating chip. */
export function WorkspaceSetupJourney({ progress, orgId }: WorkspaceSetupJourneyProps) {
  const [introOpen, setIntroOpen] = useState(false);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  useEffect(() => {
    if (!progress || progress.complete) {
      setIntroChecked(true);
      return;
    }
    if (isSetupIntroDismissed(orgId)) {
      setIntroOpen(false);
      setIntroChecked(true);
      return;
    }
    setIntroOpen(true);
    setIntroChecked(true);
  }, [orgId, progress]);

  const dismissIntro = useCallback(() => {
    dismissSetupIntro(orgId);
    setIntroOpen(false);
  }, [orgId]);

  const openChecklist = useCallback(() => {
    dismissSetupIntro(orgId);
    setIntroOpen(false);
    setFloatingOpen(true);
  }, [orgId]);

  const startTour = useCallback(() => {
    dismissSetupIntro(orgId);
    setIntroOpen(false);
    setFloatingOpen(false);
    setTourOpen(true);
  }, [orgId]);

  if (!progress || progress.complete || !introChecked) return null;

  return (
    <>
      <WorkspaceSetupIntroDialog
        open={introOpen}
        progress={progress}
        onDismiss={dismissIntro}
        onStartTour={startTour}
        onShowChecklist={openChecklist}
      />
      <WorkspaceSetupFloating
        orgId={orgId}
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
