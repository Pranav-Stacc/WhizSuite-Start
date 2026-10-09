'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { completeUploadAction, requestUploadAction } from '../actions/media.actions';
import { uploadToStorage } from '../utils/upload-to-storage';

const FALLBACK_MIME_TYPE = 'application/octet-stream';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  key: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
}

async function uploadOne(file: File, clientId: string, onProgress: (fraction: number) => void): Promise<void> {
  const ticket = await requestUploadAction({
    filename: file.name,
    mimeType: file.type || FALLBACK_MIME_TYPE,
    sizeBytes: file.size,
    clientId,
  });
  if (!ticket.ok) throw new Error(ticket.message);
  if (!ticket.data) throw new Error(t('toast.failed'));
  await uploadToStorage(ticket.data.uploadUrl, file, ticket.data.headers, onProgress);
  const done = await completeUploadAction(ticket.data.assetId);
  if (!done.ok) throw new Error(done.message);
}

function toItems(files: Iterable<File>): UploadItem[] {
  return [...files].map((file, index) => ({ key: `${index}-${file.name}-${file.size}-${file.lastModified}`, file, progress: 0, status: 'queued' }));
}

/** Presign → PUT to storage → complete, sequentially, with per-file progress. */
export function useAssetUpload() {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);

  const patch = (key: string, next: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...next } : item)));

  /** Uploads the given items for a client; returns how many failed. */
  const run = async (queue: UploadItem[], clientId: string): Promise<number> => {
    setBusy(true);
    let failed = 0;
    for (const item of queue) {
      if (item.status === 'done') continue;
      patch(item.key, { status: 'uploading', progress: 0, error: undefined });
      try {
        await uploadOne(item.file, clientId, (progress) => patch(item.key, { progress }));
        patch(item.key, { status: 'done', progress: 1 });
      } catch (error) {
        failed += 1;
        patch(item.key, { status: 'error', error: error instanceof Error ? error.message : t('toast.failed') });
      }
    }
    setBusy(false);
    router.refresh();
    if (failed === 0) toast.success(t('media.upload.allDone', { count: queue.length }));
    else toast.error(t('media.upload.someFailed', { count: failed }));
    return failed;
  };

  return {
    items,
    busy,
    pending: items.filter((item) => item.status !== 'done'),
    select: (files: FileList | null) => setItems(toItems(files ?? [])),
    reset: () => setItems([]),
    start: (clientId: string) => run(items, clientId),
    /** Queues and immediately uploads, for drop zones bound to one client. */
    uploadNow: (files: FileList | File[], clientId: string) => {
      const queue = toItems(files);
      setItems(queue);
      return run(queue, clientId);
    },
  };
}
