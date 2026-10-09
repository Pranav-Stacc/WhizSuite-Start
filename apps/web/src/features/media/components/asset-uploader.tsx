'use client';

import { useId, useState, type ReactNode } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Select } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import { useAssetUpload } from '../hooks/use-asset-upload';
import { UploadProgressList } from './upload-progress-list';

interface AssetUploaderProps {
  clients: Array<{ id: string; name: string }>;
  trigger: ReactNode;
  defaultOpen?: boolean;
  defaultClientId?: string;
}

export function AssetUploader({ clients, trigger, defaultOpen = false, defaultClientId }: AssetUploaderProps) {
  const ids = { client: useId(), files: useId() };
  const [open, setOpen] = useState(defaultOpen);
  const [clientId, setClientId] = useState(defaultClientId ?? '');
  const upload = useAssetUpload();

  const start = async () => {
    const failed = await upload.start(clientId);
    if (failed === 0) {
      upload.reset();
      setOpen(false);
    }
  };

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Modal
        open={open}
        onOpenChange={(next) => !upload.busy && setOpen(next)}
        title={t('media.upload.title')}
        description={t('media.upload.desc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={upload.busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={start} disabled={upload.busy || !clientId || upload.pending.length === 0}>
              {upload.busy ? <Loader2 className="animate-spin" /> : <UploadCloud />}
              {upload.busy ? t('media.upload.uploading') : t('media.upload.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('media.field.client')} htmlFor={ids.client} required>
            <Select id={ids.client} value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={upload.busy} required>
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
              disabled={upload.busy}
              onChange={(e) => upload.select(e.target.files)}
              className="block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-[11px] file:uppercase file:tracking-[0.12em]"
            />
          </Field>

          <UploadProgressList items={upload.items} />
        </div>
      </Modal>
    </>
  );
}
