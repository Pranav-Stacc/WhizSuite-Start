import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  type EmbeddedMediaDto,
  type MediaAssetDto,
  type MediaAssetStatus,
  type MediaDownloadDisposition,
  type MediaDownloadUrlDto,
  type ListMediaAssetsQuery,
  type PresignMediaUploadInput,
  type PresignedMediaUploadDto,
  type UpdateMediaAssetInput,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  problem,
} from '../../../../shared/errors/problem-details.exception';
import { StorageService } from '../../../../shared/storage/storage.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { MediaRepository } from '../../infrastructure/repositories/media.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import {
  toMediaAssetDto,
  type MediaAssetRecord,
} from '../mappers/media-asset.mapper';
import { isMimeTypeAllowed } from '../utils/mime-type';

const ENTITY_TYPE = 'mediaAsset';
const PREVIEWABLE_MIME_PREFIXES = ['image/', 'video/'];

function isPreviewable(mimeType: string): boolean {
  return PREVIEWABLE_MIME_PREFIXES.some((prefix) =>
    mimeType.startsWith(prefix),
  );
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly repository: MediaRepository,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** Library listing; ready images/videos carry a short-lived inline `previewUrl` for thumbnails. */
  async list(
    organizationId: string,
    query: ListMediaAssetsQuery = {},
  ): Promise<MediaAssetDto[]> {
    const assets = await this.repository.list(
      organizationId,
      this.config.get('MEDIA_LIST_LIMIT', { infer: true }),
      TenantContext.clientScope(),
      query,
    );
    const previewable = assets
      .filter((a) => a.status === 'READY' && isPreviewable(a.mimeType))
      .map((a) => a.id);
    const previews = await this.resolveForEmbedding(
      organizationId,
      previewable,
    );
    return assets.map((asset) => ({
      ...toMediaAssetDto(asset),
      previewUrl: previews.get(asset.id)?.url ?? null,
    }));
  }

  async get(organizationId: string, id: string): Promise<MediaAssetDto> {
    return toMediaAssetDto(await this.findOrThrow(organizationId, id));
  }

  async createPresignedUpload(
    organizationId: string,
    actorId: string,
    input: PresignMediaUploadInput,
  ): Promise<PresignedMediaUploadDto> {
    const clientId = input.clientId ?? TenantContext.clientScope()?.[0];
    if (!TenantContext.canAccessClient(clientId))
      throw notFound('Client not found');
    const mimeType = input.mimeType.toLowerCase();
    if (
      !isMimeTypeAllowed(
        mimeType,
        this.config.get('STORAGE_ALLOWED_MIME_TYPES', { infer: true }),
      )
    ) {
      throw problem(
        400,
        'Bad Request',
        ErrorCodes.MEDIA_TYPE_NOT_ALLOWED,
        `File type ${mimeType} is not allowed`,
      );
    }
    const maxBytes = this.config.get('STORAGE_UPLOAD_MAX_BYTES', {
      infer: true,
    });
    if (input.sizeBytes > maxBytes) {
      throw problem(
        400,
        'Bad Request',
        ErrorCodes.MEDIA_TOO_LARGE,
        `File exceeds the ${maxBytes} byte limit`,
      );
    }

    const presigned = await this.storage.createPresignedUpload({
      organizationId,
      filename: input.filename,
      mimeType,
      sizeBytes: input.sizeBytes,
    });
    const asset = await this.repository.createWithVersion(organizationId, {
      name: input.filename,
      mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: presigned.storageKey,
      createdById: actorId,
      clientId,
      folderId: input.folderId,
      projectId: input.projectId,
      calendarItemId: input.calendarItemId,
      searchText: [input.filename, ...(input.tags ?? [])].join(' ').toLowerCase(),
    });
    if (input.tags?.length) {
      await this.repository.setAssetTags(organizationId, asset.id, input.tags);
    }
    const dto = toMediaAssetDto(
      (await this.repository.findById(organizationId, asset.id)) ?? asset,
    );
    await this.record(
      organizationId,
      actorId,
      'media/assets.presign',
      asset.id,
      {
        after: { ...dto, storageKey: presigned.storageKey },
      },
    );
    return {
      asset: dto,
      uploadUrl: presigned.uploadUrl,
      method: 'PUT',
      headers: presigned.headers,
      expiresInSeconds: presigned.expiresInSeconds,
    };
  }

  async completeUpload(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<MediaAssetDto> {
    const asset = await this.findOrThrow(organizationId, id);
    if (asset.status === 'READY') return toMediaAssetDto(asset);

    const storageKey = await this.repository.findCurrentStorageKey(
      organizationId,
      asset,
    );
    const stored = storageKey
      ? await this.storage.getObjectMetadata(storageKey)
      : null;
    if (!storageKey || !stored) {
      throw problem(
        409,
        'Conflict',
        ErrorCodes.MEDIA_UPLOAD_INCOMPLETE,
        'The file has not been uploaded yet',
      );
    }
    if (stored.sizeBytes !== Number(asset.sizeBytes)) {
      await this.repository.setStatus(organizationId, id, 'FAILED');
      await this.storage.deleteObjects([storageKey]);
      await this.record(organizationId, actorId, 'media/assets.complete', id, {
        outcome: 'FAILURE',
        reason: `size mismatch: expected ${asset.sizeBytes}, got ${stored.sizeBytes}`,
      });
      throw problem(
        409,
        'Conflict',
        ErrorCodes.MEDIA_UPLOAD_INCOMPLETE,
        'Uploaded file size does not match',
      );
    }

    await this.repository.setStatus(organizationId, id, 'READY');
    await this.record(organizationId, actorId, 'media/assets.complete', id, {
      before: { status: asset.status },
      after: { status: 'READY' },
    });
    return this.get(organizationId, id);
  }

  async createDownloadUrl(
    organizationId: string,
    actorId: string,
    id: string,
    disposition: MediaDownloadDisposition,
  ): Promise<MediaDownloadUrlDto> {
    const asset = await this.findOrThrow(organizationId, id);
    const storageKey = await this.repository.findCurrentStorageKey(
      organizationId,
      asset,
    );
    if (asset.status !== 'READY' || !storageKey) {
      throw problem(
        409,
        'Conflict',
        ErrorCodes.MEDIA_NOT_READY,
        'The file is not available yet',
      );
    }
    const download = await this.storage.createPresignedDownload(storageKey, {
      filename: asset.name,
      disposition,
    });
    await this.record(organizationId, actorId, 'media/assets.download', id, {
      metadata: { disposition },
    });
    return download;
  }

  /** Batch lookup for other domains; ids that are missing, deleted or in another org are absent from the map. */
  async resolveForEmbedding(
    organizationId: string,
    assetIds: string[],
  ): Promise<Map<string, EmbeddedMediaDto>> {
    const resolved = new Map<string, EmbeddedMediaDto>();
    const uniqueIds = [...new Set(assetIds)];
    if (uniqueIds.length === 0) return resolved;

    const assets = await this.repository.findForEmbedding(
      organizationId,
      uniqueIds,
    );
    const entries = await Promise.all(
      assets.map(async (asset): Promise<EmbeddedMediaDto> => {
        const storageKey = asset.versions.find(
          (v) => v.version === asset.currentVersion,
        )?.storageKey;
        const status = asset.status as MediaAssetStatus;
        const url =
          status === 'READY' && storageKey
            ? (
                await this.storage.createPresignedDownload(storageKey, {
                  filename: asset.name,
                  disposition: 'inline',
                })
              ).url
            : null;
        return {
          assetId: asset.id,
          name: asset.name,
          mimeType: asset.mimeType,
          status,
          url,
        };
      }),
    );
    for (const entry of entries) resolved.set(entry.assetId, entry);
    return resolved;
  }

  async setTags(
    organizationId: string,
    actorId: string,
    id: string,
    tags: string[],
  ): Promise<MediaAssetDto> {
    await this.findOrThrow(organizationId, id);
    await this.repository.setAssetTags(organizationId, id, tags);
    const after = await this.get(organizationId, id);
    await this.record(organizationId, actorId, 'media/assets.tag', id, {
      after: { tags: after.tags },
    });
    return after;
  }

  async recordUsage(
    organizationId: string,
    actorId: string,
    input: {
      assetId: string;
      subjectType: string;
      subjectId: string;
    },
  ) {
    await this.findOrThrow(organizationId, input.assetId);
    await this.repository.recordUsage({ organizationId, ...input });
    await this.record(
      organizationId,
      actorId,
      'media/assets.usage',
      input.assetId,
      { after: input },
    );
    return { ok: true as const };
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    data: UpdateMediaAssetInput,
  ): Promise<MediaAssetDto> {
    const before = await this.findOrThrow(organizationId, id);
    await this.repository.update(organizationId, id, data);
    const after = await this.get(organizationId, id);
    await this.record(organizationId, actorId, 'media/assets.update', id, {
      before: toMediaAssetDto(before),
      after,
    });
    return after;
  }

  async remove(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<void> {
    const asset = await this.findOrThrow(organizationId, id);
    const storageKeys = await this.repository.findAllStorageKeys(
      organizationId,
      id,
    );
    await this.repository.softDelete(organizationId, id);
    await this.record(organizationId, actorId, 'media/assets.delete', id, {
      before: toMediaAssetDto(asset),
    });
    try {
      await this.storage.deleteObjects(storageKeys);
    } catch (error) {
      this.logger.warn(
        { err: error, assetId: id, storageKeys },
        'Failed to delete media objects from storage',
      );
    }
  }

  private async findOrThrow(
    organizationId: string,
    id: string,
  ): Promise<MediaAssetRecord> {
    const asset = await this.repository.findById(organizationId, id);
    if (!asset || !TenantContext.canAccessClient(asset.clientId))
      throw notFound();
    return asset;
  }

  private record(
    organizationId: string,
    actorId: string,
    action: string,
    entityId: string,
    details: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      outcome?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    return this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action,
      entityType: ENTITY_TYPE,
      entityId,
      ...details,
    });
  }
}
