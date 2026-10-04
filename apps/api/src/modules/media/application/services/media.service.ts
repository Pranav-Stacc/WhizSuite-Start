import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  type ErrorCode,
  type MediaAssetDto,
  type MediaDownloadDisposition,
  type MediaDownloadUrlDto,
  type PresignMediaUploadInput,
  type PresignedMediaUploadDto,
  type UpdateMediaAssetInput,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { StorageService } from '../../../../shared/storage/storage.service';
import { MediaRepository } from '../../infrastructure/repositories/media.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import { toMediaAssetDto, type MediaAssetRecord } from '../mappers/media-asset.mapper';
import { isMimeTypeAllowed } from '../utils/mime-type';

const ENTITY_TYPE = 'mediaAsset';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly repository: MediaRepository,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string): Promise<MediaAssetDto[]> {
    const assets = await this.repository.list(organizationId, this.config.get('MEDIA_LIST_LIMIT'));
    return assets.map(toMediaAssetDto);
  }

  async get(organizationId: string, id: string): Promise<MediaAssetDto> {
    return toMediaAssetDto(await this.findOrThrow(organizationId, id));
  }

  async createPresignedUpload(
    organizationId: string,
    actorId: string,
    input: PresignMediaUploadInput,
  ): Promise<PresignedMediaUploadDto> {
    const mimeType = input.mimeType.toLowerCase();
    if (!isMimeTypeAllowed(mimeType, this.config.get('STORAGE_ALLOWED_MIME_TYPES'))) {
      throw problem(400, 'Bad Request', ErrorCodes.MEDIA_TYPE_NOT_ALLOWED, `File type ${mimeType} is not allowed`);
    }
    const maxBytes = this.config.get('STORAGE_UPLOAD_MAX_BYTES');
    if (input.sizeBytes > maxBytes) {
      throw problem(400, 'Bad Request', ErrorCodes.MEDIA_TOO_LARGE, `File exceeds the ${maxBytes} byte limit`);
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
      clientId: input.clientId,
      folderId: input.folderId,
    });
    const dto = toMediaAssetDto(asset);
    await this.record(organizationId, actorId, 'media/assets.presign', asset.id, {
      after: { ...dto, storageKey: presigned.storageKey },
    });
    return {
      asset: dto,
      uploadUrl: presigned.uploadUrl,
      method: 'PUT',
      headers: presigned.headers,
      expiresInSeconds: presigned.expiresInSeconds,
    };
  }

  async completeUpload(organizationId: string, actorId: string, id: string): Promise<MediaAssetDto> {
    const asset = await this.findOrThrow(organizationId, id);
    if (asset.status === 'READY') return toMediaAssetDto(asset);

    const storageKey = await this.repository.findCurrentStorageKey(organizationId, asset);
    const stored = storageKey ? await this.storage.getObjectMetadata(storageKey) : null;
    if (!storageKey || !stored) {
      throw problem(409, 'Conflict', ErrorCodes.MEDIA_UPLOAD_INCOMPLETE, 'The file has not been uploaded yet');
    }
    if (stored.sizeBytes !== Number(asset.sizeBytes)) {
      await this.repository.setStatus(organizationId, id, 'FAILED');
      await this.storage.deleteObjects([storageKey]);
      await this.record(organizationId, actorId, 'media/assets.complete', id, {
        outcome: 'FAILURE',
        reason: `size mismatch: expected ${asset.sizeBytes}, got ${stored.sizeBytes}`,
      });
      throw problem(409, 'Conflict', ErrorCodes.MEDIA_UPLOAD_INCOMPLETE, 'Uploaded file size does not match');
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
    const storageKey = await this.repository.findCurrentStorageKey(organizationId, asset);
    if (asset.status !== 'READY' || !storageKey) {
      throw problem(409, 'Conflict', ErrorCodes.MEDIA_NOT_READY, 'The file is not available yet');
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

  async remove(organizationId: string, actorId: string, id: string): Promise<void> {
    const asset = await this.findOrThrow(organizationId, id);
    const storageKeys = await this.repository.findAllStorageKeys(organizationId, id);
    await this.repository.softDelete(organizationId, id);
    await this.record(organizationId, actorId, 'media/assets.delete', id, {
      before: toMediaAssetDto(asset),
    });
    try {
      await this.storage.deleteObjects(storageKeys);
    } catch (error) {
      this.logger.warn({ err: error, assetId: id, storageKeys }, 'Failed to delete media objects from storage');
    }
  }

  private async findOrThrow(organizationId: string, id: string): Promise<MediaAssetRecord> {
    const asset = await this.repository.findById(organizationId, id);
    if (!asset) throw problem(404, 'Not Found', ErrorCodes.NOT_FOUND);
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

function problem(status: number, title: string, code: ErrorCode, detail?: string) {
  return new ProblemDetailsException({ type: 'about:blank', title, status, code, detail }, status);
}
