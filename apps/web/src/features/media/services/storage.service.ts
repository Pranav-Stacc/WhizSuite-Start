import 'server-only';
import type {
  CreateMediaDriveTransferInput,
  CreateMediaZipExportInput,
  MediaDataSourceDto,
  MediaExportJobDto,
  MediaStorageUsageDto,
} from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { isLiveMode } from '@/shared/config/env';
import { requireSession } from '@/shared/auth/session';
import { listAssets } from './media.service';

const DEMO_LIMIT_BYTES = 50 * 1024 * 1024 * 1024;

export async function getStorageUsage(): Promise<MediaStorageUsageDto> {
  if (isLiveMode) {
    const session = await requireSession();
    return apiFetch<MediaStorageUsageDto>(orgPath(session.orgId, 'media/storage-usage'));
  }
  const assets = await listAssets();
  const usedBytes = assets.reduce((acc, a) => acc + a.sizeKb * 1024, 0);
  return {
    usedBytes,
    limitBytes: DEMO_LIMIT_BYTES,
    assetCount: assets.length,
    ratio: usedBytes / DEMO_LIMIT_BYTES,
  };
}

export async function listDataSources(): Promise<MediaDataSourceDto[]> {
  if (isLiveMode) {
    const session = await requireSession();
    return apiFetch<MediaDataSourceDto[]>(orgPath(session.orgId, 'media/data-sources'));
  }
  return [
    {
      id: 'platform',
      kind: 'platform',
      name: 'Platform storage',
      status: 'AVAILABLE',
      connectionId: null,
      connectedAt: null,
      metadata: { systemOfRecord: true },
    },
    {
      id: 'google_drive',
      kind: 'google_drive',
      name: 'Google Drive',
      status: 'DISABLED',
      connectionId: null,
      connectedAt: null,
      metadata: { oauthConfigured: false, demo: true },
    },
  ];
}

export async function beginGoogleDriveConnect(): Promise<{ authorizeUrl: string }> {
  const session = await requireSession();
  return apiFetch<{ authorizeUrl: string }>(orgPath(session.orgId, 'media/data-sources/google-drive/connect'), {
    method: 'POST',
  });
}

export async function disconnectGoogleDrive(connectionId: string): Promise<void> {
  const session = await requireSession();
  await apiFetch(orgPath(session.orgId, `media/data-sources/google-drive/${connectionId}/disconnect`), {
    method: 'POST',
  });
}

export async function createZipExport(input: CreateMediaZipExportInput): Promise<MediaExportJobDto> {
  if (!isLiveMode) {
    return {
      id: 'demo-zip',
      kind: 'ZIP',
      status: 'FAILED',
      progress: 0,
      downloadUrl: null,
      error: 'Zip export requires the live workspace',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }
  const session = await requireSession();
  return apiFetch<MediaExportJobDto>(orgPath(session.orgId, 'media/exports/zip'), {
    method: 'POST',
    body: input,
  });
}

export async function createDriveTransfer(input: CreateMediaDriveTransferInput): Promise<MediaExportJobDto> {
  if (!isLiveMode) {
    return {
      id: 'demo-drive',
      kind: 'DRIVE_TRANSFER',
      status: 'FAILED',
      progress: 0,
      downloadUrl: null,
      error: 'Drive transfer requires the live workspace',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }
  const session = await requireSession();
  return apiFetch<MediaExportJobDto>(orgPath(session.orgId, 'media/exports/drive'), {
    method: 'POST',
    body: input,
  });
}

export async function getExportJob(jobId: string): Promise<MediaExportJobDto> {
  const session = await requireSession();
  return apiFetch<MediaExportJobDto>(orgPath(session.orgId, `media/exports/${jobId}`));
}
