import type { MediaAsset, MediaAssetVersion } from '@prisma/client';
import type { MediaAssetDto, MediaAssetStatus, MediaFolderDto } from '@agency-os/contracts';

export type MediaAssetRecord = Pick<
  MediaAsset,
  | 'id'
  | 'organizationId'
  | 'clientId'
  | 'folderId'
  | 'projectId'
  | 'calendarItemId'
  | 'name'
  | 'mimeType'
  | 'sizeBytes'
  | 'status'
  | 'currentVersion'
  | 'createdById'
  | 'createdAt'
  | 'updatedAt'
> & { tags?: Array<{ tag: { name: string } }> };

export type MediaEmbeddingRecord = Pick<
  MediaAsset,
  'id' | 'name' | 'mimeType' | 'status' | 'currentVersion'
> & { versions: Pick<MediaAssetVersion, 'version' | 'storageKey'>[] };

export type MediaFolderRecord = {
  id: string;
  organizationId: string;
  clientId: string | null;
  projectId: string | null;
  calendarItemId: string | null;
  parentId: string | null;
  name: string;
  path: string;
  visibility: string;
  description: string | null;
  createdAt: Date;
};

export function toMediaAssetDto(asset: MediaAssetRecord): MediaAssetDto {
  return {
    id: asset.id,
    organizationId: asset.organizationId,
    clientId: asset.clientId,
    folderId: asset.folderId,
    projectId: asset.projectId,
    calendarItemId: asset.calendarItemId,
    name: asset.name,
    mimeType: asset.mimeType,
    sizeBytes: Number(asset.sizeBytes),
    status: asset.status as MediaAssetStatus,
    currentVersion: asset.currentVersion,
    tags: (asset.tags ?? []).map((row) => row.tag.name),
    createdById: asset.createdById,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export function toMediaFolderDto(folder: MediaFolderRecord): MediaFolderDto {
  return {
    id: folder.id,
    organizationId: folder.organizationId,
    clientId: folder.clientId,
    projectId: folder.projectId,
    calendarItemId: folder.calendarItemId,
    parentId: folder.parentId,
    name: folder.name,
    path: folder.path,
    visibility: folder.visibility as MediaFolderDto['visibility'],
    description: folder.description,
    createdAt: folder.createdAt.toISOString(),
  };
}
