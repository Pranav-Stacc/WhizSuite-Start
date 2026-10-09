'use server';

import { Permissions, createMediaFolderFormSchema } from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { createFolder, ensureClientFolders } from '../services/folders.service';

export async function ensureClientFoldersAction(clientId: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.FILES_UPLOAD);
    if (!clientId) return fail(t('toast.invalid'));
    await ensureClientFolders(clientId);
    await refreshData('media');
    return succeed(undefined, t('clients.assets.foldersReady'));
  });
}

export async function createFolderAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.FILES_UPLOAD);
    const parsed = parseInput(createMediaFolderFormSchema, raw);
    if (!parsed.ok) return parsed.result;
    const folder = await createFolder({
      name: parsed.data.name,
      parentId: parsed.data.parentId,
      clientId: parsed.data.clientId,
      visibility: parsed.data.visibility,
    });
    await recordAudit({
      action: 'media.folder.created',
      entityType: 'media_folder',
      entityId: folder.id,
      entityLabel: folder.name,
      summary: 'Created media folder',
    });
    await refreshData('media');
    return succeed(undefined, t('clients.assets.folderCreated'));
  });
}
