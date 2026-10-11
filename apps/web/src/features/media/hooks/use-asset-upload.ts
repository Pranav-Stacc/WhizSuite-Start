'use client';

import { useState } from 'react';
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

async function uploadOne(
  file: File,
  clientId: string,
  onProgress: (fraction: number) => void,
  options?: { folderId?: string; projectId?: string },
): Promise<string> {
  const ticket = await requestUploadAction({
    filename: file.name,
    mimeType: file.type || FALLBACK_MIME_TYPE,
    sizeBytes: file.size,
    clientId,
    folderId: options?.folderId,
    projectId: options?.projectId,
  });
  if (!ticket.ok) throw new Error(ticket.message);
  if (!ticket.data) throw new Error(t('toast.failed'));
  await uploadToStorage(ticket.data.uploadUrl, file, ticket.data.headers, onProgress);
  const done = await completeUploadAction(ticket.data.assetId);
  if (!done.ok) throw new Error(done.message);
  return ticket.data.assetId;
}

function toItems(files: Iterable<File>): UploadItem[] {
  return [...files].map((file, index) => ({ key: `${index}-${file.name}-${file.size}-${file.lastModified}`, file, progress: 0, status: 'queued' }));
}

/** Presign → PUT to storage → complete, sequentially, with per-file progress. */
export function useAssetUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);

  const patch = (key: string, next: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...next } : item)));

  /** Uploads the given items for a client; returns failures and new asset ids. */
  const run = async (
    queue: UploadItem[],
    clientId: string,
    options?: { folderId?: string; projectId?: string },
  ): Promise<{ failed: number; assetIds: string[]; uploaded: { assetId: string; name: string; mimeType: string }[] }> => {
    setBusy(true);
    let failed = 0;
    const assetIds: string[] = [];
    const uploaded: { assetId: string; name: string; mimeType: string }[] = [];
    for (const item of queue) {
      if (item.status === 'done') continue;
      patch(item.key, { status: 'uploading', progress: 0, error: undefined });
      try {
        const assetId = await uploadOne(item.file, clientId, (progress) => patch(item.key, { progress }), options);
        assetIds.push(assetId);
        uploaded.push({ assetId, name: item.file.name, mimeType: item.file.type || FALLBACK_MIME_TYPE });
        patch(item.key, { status: 'done', progress: 1 });
      } catch (error) {
        failed += 1;
        patch(item.key, { status: 'error', error: error instanceof Error ? error.message : t('toast.failed') });
      }
    }
    setBusy(false);
    if (failed === 0) toast.success(t('media.upload.allDone', { count: queue.length }));
    else toast.error(t('media.upload.someFailed', { count: failed }));
    return { failed, assetIds, uploaded };
  };

  return {
    items,
    busy,
    pending: items.filter((item) => item.status !== 'done'),
    select: (files: FileList | null) => setItems(toItems(files ?? [])),
    reset: () => setItems([]),
    start: (clientId: string, options?: { folderId?: string; projectId?: string }) => run(items, clientId, options),
    /** Queues and immediately uploads, for drop zones bound to one client. */
    uploadNow: (files: FileList | File[], clientId: string, options?: { folderId?: string; projectId?: string }) => {
      const queue = toItems(files);
      setItems(queue);
      return run(queue, clientId, options);
    },
  };
}
