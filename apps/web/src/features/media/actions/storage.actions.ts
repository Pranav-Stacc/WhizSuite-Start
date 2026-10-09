'use server';

import { Permissions } from '@agency-os/contracts';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { t } from '@/shared/i18n/t';
import {
  beginGoogleDriveConnect,
  createDriveTransfer,
  createZipExport,
  disconnectGoogleDrive,
  getExportJob,
} from '../services/storage.service';

export async function connectGoogleDriveAction(): Promise<ActionResult<{ authorizeUrl: string }>> {
  await requirePermission(Permissions.INTEGRATIONS_MANAGE);
  if (!isLiveMode) return fail(t('media.storage.drive.liveOnly'));
  try {
    const result = await beginGoogleDriveConnect();
    return succeed(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : t('media.storage.drive.connectFailed'));
  }
}

export async function disconnectGoogleDriveAction(connectionId: string): Promise<ActionResult> {
  await requirePermission(Permissions.INTEGRATIONS_MANAGE);
  if (!isLiveMode) return fail(t('media.storage.drive.liveOnly'));
  try {
    await disconnectGoogleDrive(connectionId);
    revalidatePath('/settings');
    revalidatePath('/media');
    return succeed();
  } catch (error) {
    return fail(error instanceof Error ? error.message : t('media.storage.drive.disconnectFailed'));
  }
}

export async function zipAssetsAction(assetIds: string[]): Promise<ActionResult<{ downloadUrl: string }>> {
  await requirePermission(Permissions.FILES_VIEW);
  if (assetIds.length === 0) return fail(t('media.export.zip.empty'));
  try {
    let job = await createZipExport({ assetIds });
    for (let i = 0; i < 40 && (job.status === 'QUEUED' || job.status === 'RUNNING'); i += 1) {
      await new Promise((r) => setTimeout(r, 500));
      job = await getExportJob(job.id);
    }
    if (job.status === 'READY' && job.downloadUrl) {
      return succeed({ downloadUrl: job.downloadUrl });
    }
    return fail(job.error ?? t('media.export.zip.failed'));
  } catch (error) {
    return fail(error instanceof Error ? error.message : t('media.export.zip.failed'));
  }
}

export async function transferAllToDriveAction(connectionId: string): Promise<ActionResult> {
  await requirePermission(Permissions.FILES_UPLOAD);
  if (!isLiveMode) return fail(t('media.storage.drive.liveOnly'));
  try {
    const job = await createDriveTransfer({
      connectionId,
      transferAll: true,
      assetIds: [],
    });
    if (job.status === 'FAILED') return fail(job.error ?? t('media.export.drive.failed'));
    revalidatePath('/media');
    revalidatePath('/settings');
    return succeed();
  } catch (error) {
    return fail(error instanceof Error ? error.message : t('media.export.drive.failed'));
  }
}
