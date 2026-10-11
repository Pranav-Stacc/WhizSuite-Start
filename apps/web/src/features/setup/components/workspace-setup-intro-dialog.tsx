'use client';

import { Sparkles } from 'lucide-react';
import type { SetupProgress } from '../types';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Modal } from '@/shared/ui/overlays';
import { Progress } from '@/shared/ui/feedback';

interface WorkspaceSetupIntroDialogProps {
  open: boolean;
  progress: SetupProgress;
  onOpenChange: (open: boolean) => void;
  onStartTour: () => void;
  onShowChecklist: () => void;
}

export function WorkspaceSetupIntroDialog({
  open,
  progress,
  onOpenChange,
  onStartTour,
  onShowChecklist,
}: WorkspaceSetupIntroDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('setup.title')}
      description={t('setup.intro.desc')}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('setup.intro.later')}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onShowChecklist}>
            {t('setup.intro.checklist')}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onStartTour}>
            {t('setup.intro.startTour')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-[13px] leading-relaxed text-muted">{t('setup.desc')}</p>
        </div>
        <div>
          <Progress value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0} />
          <p className="mt-1.5 text-[11px] text-muted">
            {t('setup.progress', { done: progress.completed, total: progress.total })}
          </p>
        </div>
      </div>
    </Modal>
  );
}
