'use client';

import { useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { createFolderAction, ensureClientFoldersAction } from '../actions/folder.actions';

export function EnsureFoldersButton({ clientId }: { clientId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await ensureClientFoldersAction(clientId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {t('clients.assets.ensureFolders')}
    </Button>
  );
}

export function NewFolderDialog({
  clientId,
  parentId,
  trigger,
}: {
  clientId: string;
  parentId?: string;
  trigger: ReactNode;
}) {
  return (
    <FormDialog
      schema="mediaFolder"
      title={t('clients.assets.newFolder')}
      trigger={trigger}
      submitLabel={t('clients.assets.newFolder')}
      defaults={{ clientId, parentId: parentId ?? '', name: '', visibility: 'INTERNAL' }}
      action={createFolderAction}
      fields={[
        { name: 'name', label: t('clients.assets.folderName'), required: true, span: 2 },
        {
          name: 'visibility',
          label: t('clients.assets.visibility'),
          type: 'select',
          options: [
            { value: 'INTERNAL', label: t('clients.assets.visibility.internal') },
            { value: 'CLIENT_VISIBLE', label: t('clients.assets.visibility.client') },
          ],
        },
      ]}
    />
  );
}
