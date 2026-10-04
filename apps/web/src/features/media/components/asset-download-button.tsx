'use client';

import { useTransition } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { assetDownloadUrlAction } from '../actions/media.actions';

export function AssetDownloadButton({ assetId, name }: { assetId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={t('media.download.label', { name })}
      onClick={() =>
        startTransition(async () => {
          const result = await assetDownloadUrlAction(assetId, 'attachment');
          if (!result.ok) toast.error(result.message);
          else if (result.data) window.location.assign(result.data.url);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Download />}
      {t('media.download')}
    </Button>
  );
}
