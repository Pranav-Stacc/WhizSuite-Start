import { Injectable } from '@nestjs/common';
import type { MediaAssetStatus, UpdateMediaAssetInput } from '@agency-os/contracts';
import { PrismaService } from '../../../../shared/database/prisma.service';
import type { MediaAssetRecord } from '../../application/mappers/media-asset.mapper';

const ASSET_SELECT = {
  id: true,
  organizationId: true,
  clientId: true,
  folderId: true,
  name: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  currentVersion: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number): Promise<MediaAssetRecord[]> {
    return this.prisma.mediaAsset.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: ASSET_SELECT,
    });
  }

  findById(organizationId: string, id: string): Promise<MediaAssetRecord | null> {
    return this.prisma.mediaAsset.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: ASSET_SELECT,
    });
  }

  async findCurrentStorageKey(organizationId: string, asset: MediaAssetRecord): Promise<string | null> {
    const version = await this.prisma.mediaAssetVersion.findFirst({
      where: { organizationId, assetId: asset.id, version: asset.currentVersion },
      select: { storageKey: true },
    });
    return version?.storageKey ?? null;
  }

  async findAllStorageKeys(organizationId: string, assetId: string): Promise<string[]> {
    const versions = await this.prisma.mediaAssetVersion.findMany({
      where: { organizationId, assetId },
      select: { storageKey: true, renditions: { select: { storageKey: true } } },
    });
    return versions.flatMap((v) => [v.storageKey, ...v.renditions.map((r) => r.storageKey)]);
  }

  createWithVersion(
    organizationId: string,
    input: {
      name: string;
      mimeType: string;
      sizeBytes: number;
      storageKey: string;
      createdById: string;
      clientId?: string;
      folderId?: string;
    },
  ): Promise<MediaAssetRecord> {
    return this.prisma.mediaAsset.create({
      data: {
        organizationId,
        name: input.name,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        status: 'PENDING_UPLOAD' satisfies MediaAssetStatus,
        createdById: input.createdById,
        clientId: input.clientId,
        folderId: input.folderId,
        versions: {
          create: { organizationId, version: 1, storageKey: input.storageKey },
        },
      },
      select: ASSET_SELECT,
    });
  }

  async update(organizationId: string, id: string, data: UpdateMediaAssetInput): Promise<void> {
    await this.prisma.mediaAsset.updateMany({
      where: { id, organizationId, deletedAt: null },
      data,
    });
  }

  async setStatus(organizationId: string, id: string, status: MediaAssetStatus): Promise<void> {
    await this.prisma.mediaAsset.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { status },
    });
  }

  async softDelete(organizationId: string, id: string): Promise<void> {
    await this.prisma.mediaAsset.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
