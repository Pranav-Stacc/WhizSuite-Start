'use client';

import { useTransition } from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';

export function WorkflowShareButton({ workflowId }: { workflowId: string }) {
  const [pending, startTransition] = useTransition();

  const copy = () => {
    startTransition(async () => {
      const url = `${window.location.origin}/workflows?edit=${encodeURIComponent(workflowId)}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('workflows.share.copied'));
      } catch {
        toast.error(t('toast.failed'));
      }
    });
  };

  return (
    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={copy} aria-label={t('workflows.share')}>
      <Link2 className="size-4" />
      {t('workflows.share')}
    </Button>
  );
}
