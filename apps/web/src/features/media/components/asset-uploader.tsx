'use client';

import { useId, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Select } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import { completeUploadAction, requestUploadAction } from '../actions/media.actions';
import { uploadToStorage } from '../utils/upload-to-storage';

const FALLBACK_MIME_TYPE = 'application/octet-stream';
const PERCENT = 100;

type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

interface UploadItem {
  key: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
}

interface AssetUploaderProps {
  clients: Array<{ id: string; name: string }>;
  trigger: ReactNode;
  defaultOpen?: boolean;
  defaultClientId?: string;
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

export function AssetUploader({ clients, trigger, defaultOpen = false, defaultClientId }: AssetUploaderProps) {
  const router = useRouter();
  const ids = { client: useId(), files: useId() };
  const [open, setOpen] = useState(defaultOpen);
  const [clientId, setClientId] = useState(defaultClientId ?? '');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);

  const patch = (key: string, next: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...next } : item)));

  const onFiles = (files: FileList | null) => {
    setItems(
      [...(files ?? [])].map((file, index) => ({ key: `${index}-${file.name}-${file.size}`, file, progress: 0, status: 'queued' })),
    );
  };

  const start = async () => {
    setBusy(true);
    let failed = 0;
    for (const item of items) {
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
    if (failed === 0) {
      toast.success(t('media.upload.allDone', { count: items.length }));
      setItems([]);
      setOpen(false);
    } else {
      toast.error(t('media.upload.someFailed', { count: failed }));
    }
  };

  const pending = items.filter((item) => item.status !== 'done');

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Modal
        open={open}
        onOpenChange={(next) => !busy && setOpen(next)}
        title={t('media.upload.title')}
        description={t('media.upload.desc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={start} disabled={busy || !clientId || pending.length === 0}>
              {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />}
              {busy ? t('media.upload.uploading') : t('media.upload.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('media.field.client')} htmlFor={ids.client} required>
            <Select id={ids.client} value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={busy} required>
              <option value="" disabled>
                {t('media.upload.pickClient')}
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('media.upload.choose')} htmlFor={ids.files} hint={t('media.upload.hint')}>
            <input
              id={ids.files}
              type="file"
              multiple
              disabled={busy}
              onChange={(e) => onFiles(e.target.files)}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </Field>

          {items.length > 0 ? (
            <ul className="space-y-2" aria-live="polite">
              {items.map((item) => (
                <li key={item.key} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate" title={item.file.name}>
                      {item.file.name}
                    </span>
                    {item.status === 'done' ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-label={t('media.upload.done')} /> : null}
                    {item.status === 'error' ? <XCircle className="size-4 shrink-0 text-danger" aria-label={t('media.upload.failed')} /> : null}
                  </div>
                  <div
                    role="progressbar"
                    aria-label={t('media.upload.progress', { name: item.file.name })}
                    aria-valuemin={0}
                    aria-valuemax={PERCENT}
                    aria-valuenow={Math.round(item.progress * PERCENT)}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
                  >
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${item.progress * PERCENT}%` }} />
                  </div>
                  {item.error ? <p className="mt-1.5 text-xs text-danger">{item.error}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
