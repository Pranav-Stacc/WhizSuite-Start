'use client';

import { useId, useRef, useState, type DragEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { useAssetUpload } from '../hooks/use-asset-upload';
import { UploadProgressList } from './upload-progress-list';

const ACCEPTED_MEDIA = 'image/*,video/*';

interface UploadDropzoneProps {
  clientId: string;
  /** Uploads need live storage; demo workspaces show the zone disabled with an explanation. */
  enabled: boolean;
  folderId?: string;
  projectId?: string;
  className?: string;
}

/** Drop files (or tap to pick, e.g. from a phone camera roll) to upload straight into a client's library. */
export function UploadDropzone({ clientId, enabled, folderId, projectId, className }: UploadDropzoneProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const upload = useAssetUpload();
  const disabled = !enabled || upload.busy;
  const options = { folderId, projectId };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    if (!disabled && e.dataTransfer.files.length) void upload.uploadNow(e.dataTransfer.files, clientId, options);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 text-center transition-colors',
          over ? 'border-foreground bg-surface-2' : 'border-border hover:border-foreground',
          disabled && 'cursor-not-allowed opacity-60 hover:border-border',
        )}
      >
        {upload.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        <span className="text-[11px] uppercase tracking-[0.16em]">{upload.busy ? t('media.upload.uploading') : t('media.dropzone.title')}</span>
        <span className="text-[11px] text-muted">{enabled ? t('media.dropzone.hint') : t('media.upload.unavailable')}</span>
        <input
          ref={input}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPTED_MEDIA}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void upload.uploadNow(e.target.files, clientId, options);
            if (input.current) input.current.value = '';
          }}
        />
      </label>
      <UploadProgressList items={upload.items.filter((item) => item.status !== 'done')} />
    </div>
  );
}
