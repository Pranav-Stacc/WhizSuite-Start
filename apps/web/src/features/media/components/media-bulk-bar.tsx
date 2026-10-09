'use client';

import { useState, useTransition } from 'react';
import { Download, X } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { zipAssetsAction } from '../actions/storage.actions';

export function MediaBulkBar({
  selectedIds,
  onClear,
}: {
  selectedIds: string[];
  onClear: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky bottom-24 z-30 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-md border border-border-soft bg-surface px-3 py-2 shadow-lg lg:bottom-6">
      <p className="text-[12px] font-medium uppercase tracking-[0.12em]">
        {t('media.bulk.selected', { count: selectedIds.length })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await zipAssetsAction(selectedIds);
              if (result.ok && result.data?.downloadUrl) {
                window.location.href = result.data.downloadUrl;
                onClear();
                return;
              }
              setError(result.ok ? t('media.export.zip.failed') : result.message);
            })
          }
        >
          <Download />
          {t('media.export.zip')}
        </Button>
        <Button variant="ghost" size="icon" aria-label={t('common.clear')} onClick={onClear}>
          <X />
        </Button>
      </div>
      {error ? <p className="w-full text-xs text-danger">{error}</p> : null}
    </div>
  );
}
