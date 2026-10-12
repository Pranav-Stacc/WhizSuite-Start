'use client';

import { useId, useState, useTransition, type ReactNode } from 'react';
import { CloudDownload, Loader2 } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Select } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import {
  getGoogleDrivePickerSessionAction,
  importFromGoogleDriveAction,
} from '../actions/storage.actions';
import { openGoogleDrivePicker } from '../utils/google-drive-picker';

interface GoogleDriveImportButtonProps {
  connectionId: string;
  clients: Array<{ id: string; name: string }>;
  defaultClientId?: string;
  folderId?: string;
  trigger?: ReactNode;
}

export function GoogleDriveImportButton({
  connectionId,
  clients,
  defaultClientId,
  folderId,
  trigger,
}: GoogleDriveImportButtonProps) {
  const ids = { client: useId() };
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const startImport = () => {
    setError(null);
    start(async () => {
      try {
        const sessionResult = await getGoogleDrivePickerSessionAction(connectionId);
        if (!sessionResult.ok || !sessionResult.data) {
          setError(sessionResult.message ?? t('media.import.drive.pickerFailed'));
          return;
        }
        const fileIds = await openGoogleDrivePicker(sessionResult.data);
        if (fileIds.length === 0) return;

        const result = await importFromGoogleDriveAction({
          connectionId,
          driveFileIds: fileIds,
          clientId,
          folderId,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setOpen(false);
      } catch (importError) {
        setError(
          importError instanceof Error
            ? importError.message
            : t('media.import.drive.failed'),
        );
      }
    });
  };

  const defaultTrigger = (
    <Button variant="secondary" size="sm" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <CloudDownload />}
      {t('media.import.drive')}
    </Button>
  );

  return (
    <>
      <span className="contents" onClick={() => !pending && setOpen(true)}>
        {trigger ?? defaultTrigger}
      </span>
      <Modal
        open={open}
        onOpenChange={(next) => !pending && setOpen(next)}
        title={t('media.import.drive.title')}
        description={t('media.import.drive.desc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={startImport}
              disabled={pending || !clientId}
            >
              {pending ? <Loader2 className="animate-spin" /> : <CloudDownload />}
              {pending ? t('media.import.drive.importing') : t('media.import.drive.choose')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('media.field.client')} htmlFor={ids.client} required>
            <Select
              id={ids.client}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={pending}
              required
            >
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
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
