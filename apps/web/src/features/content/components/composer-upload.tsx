'use client';

import { useId, useRef } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { useAssetUpload } from '@/features/media/hooks/use-asset-upload';
import type { ComposerAsset } from './slide-picker';

/** Compact upload control for the content composer — attaches new assets as slides immediately. */
export function ComposerUpload({
  clientId,
  enabled,
  onUploaded,
}: {
  clientId: string;
  enabled: boolean;
  onUploaded: (assets: ComposerAsset[]) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const upload = useAssetUpload();
  const disabled = !enabled || !clientId || upload.busy;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {upload.busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {t('content.composer.upload')}
      </Button>
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple
        accept="image/*,video/*"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const files = e.target.files;
          if (!files?.length) return;
          void upload.uploadNow(files, clientId).then((result) => {
            if (!result.uploaded.length) return;
            onUploaded(
              result.uploaded.map((item) => ({
                assetId: item.assetId,
                clientId,
                name: item.name,
                mimeType: item.mimeType,
              })),
            );
          });
          e.target.value = '';
        }}
      />
      {!enabled ? <span className={cn('text-[11px] text-muted')}>{t('media.upload.unavailable')}</span> : null}
    </div>
  );
}
