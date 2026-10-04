import type { MediaAsset } from '@prisma/client';
import type { MediaAssetDto, MediaAssetStatus } from '@agency-os/contracts';

export type MediaAssetRecord = Pick<
  MediaAsset,
  | 'id'
  | 'organizationId'
  | 'clientId'
  | 'folderId'
  | 'name'
  | 'mimeType'
  | 'sizeBytes'
  | 'status'
  | 'currentVersion'
  | 'createdById'
  | 'createdAt'
  | 'updatedAt'
>;

export function toMediaAssetDto(asset: MediaAssetRecord): MediaAssetDto {
  return {
    id: asset.id,
    organizationId: asset.organizationId,
    clientId: asset.clientId,
    folderId: asset.folderId,
    name: asset.name,
    mimeType: asset.mimeType,
    sizeBytes: Number(asset.sizeBytes),
    status: asset.status as MediaAssetStatus,
    currentVersion: asset.currentVersion,
    createdById: asset.createdById,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}
