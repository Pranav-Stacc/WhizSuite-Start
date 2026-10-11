'use client';

import { useState } from 'react';
import type { SetupProgress } from '../types';
import { SetupTour } from './setup-tour';
import { WorkspaceSetupPanel } from './workspace-setup-panel';

export function WorkspaceSetup({ progress }: { progress: SetupProgress }) {
  const [tourOpen, setTourOpen] = useState(false);

  return (
    <>
      <WorkspaceSetupPanel progress={progress} onStartTour={() => setTourOpen(true)} />
      {tourOpen ? <SetupTour progress={progress} onClose={() => setTourOpen(false)} /> : null}
    </>
  );
}
