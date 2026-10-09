import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  type CreateMediaDriveTransferInput,
  type CreateMediaZipExportInput,
  type MediaExportJobDto,
} from '@agency-os/contracts';
import type { Queue } from 'bullmq';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  problem,
  unprocessable,
} from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { MediaRepository } from '../../infrastructure/repositories/media.repository';
import {
  MEDIA_EXPORT_QUEUE,
  type MediaExportJobPayload,
  type MediaExportJobResult,
} from '../../jobs/media-export.queue';

const ZIP_TTL_HINT = 'media-export-zip';

@Injectable()
export class MediaExportService {
  private readonly logger = new Logger(MediaExportService.name);

  constructor(
    private readonly repository: MediaRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
    @InjectQueue(MEDIA_EXPORT_QUEUE)
    private readonly queue: Queue<MediaExportJobPayload, MediaExportJobResult>,
  ) {}

  async enqueueZip(
    organizationId: string,
    actorId: string,
    input: CreateMediaZipExportInput,
  ): Promise<MediaExportJobDto> {
    const assets = await this.repository.findReadyByIds(
      organizationId,
      input.assetIds,
    );
    if (assets.length === 0) {
      throw unprocessable('No ready assets to export');
    }
    const filename = sanitizeZipName(
      input.filename ?? `media-export-${new Date().toISOString().slice(0, 10)}`,
    );
    const job = await this.queue.add(
      'zip',
      {
        kind: 'ZIP',
        organizationId,
        actorId,
        assetIds: assets.map((a) => a.id),
        filename,
      },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/exports.zip',
      entityType: ZIP_TTL_HINT,
      entityId: job.id ?? 'unknown',
      after: { assetCount: assets.length, filename },
    });
    return toJobDto(job.id!, 'ZIP', 'QUEUED', 0, null, null, new Date());
  }

  async enqueueDriveTransfer(
    organizationId: string,
    actorId: string,
    input: CreateMediaDriveTransferInput,
  ): Promise<MediaExportJobDto> {
    const clientId = this.config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true });
    if (!clientId) {
      throw problem(
        503,
        'Service Unavailable',
        ErrorCodes.INTEGRATION_NOT_CONNECTED,
        'Google Drive is not configured on this deployment',
      );
    }
    let assetIds = input.assetIds;
    if (input.transferAll) {
      const all = await this.repository.listReady(
        organizationId,
        this.config.get('MEDIA_LIST_LIMIT', { infer: true }),
      );
      assetIds = all.map((a) => a.id);
    }
    if (assetIds.length === 0) {
      throw unprocessable('No ready assets to transfer');
    }
    const job = await this.queue.add(
      'drive-transfer',
      {
        kind: 'DRIVE_TRANSFER',
        organizationId,
        actorId,
        connectionId: input.connectionId,
        assetIds,
        transferAll: input.transferAll,
        driveFolderId: input.driveFolderId,
      },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/exports.drive_transfer',
      entityType: 'media-export-drive',
      entityId: job.id ?? 'unknown',
      after: {
        assetCount: assetIds.length,
        connectionId: input.connectionId,
        transferAll: input.transferAll,
      },
    });
    return toJobDto(
      job.id!,
      'DRIVE_TRANSFER',
      'QUEUED',
      0,
      null,
      null,
      new Date(),
    );
  }

  async getJob(
    organizationId: string,
    jobId: string,
  ): Promise<MediaExportJobDto> {
    const job = await this.queue.getJob(jobId);
    if (!job) throw notFound('Export job not found');
    const data = job.data;
    if (data.organizationId !== organizationId) throw notFound();
    const state = await job.getState();
    const progress =
      typeof job.progress === 'number'
        ? job.progress
        : state === 'completed'
          ? 100
          : 0;
    const result = job.returnvalue;
    const status =
      state === 'completed'
        ? result?.error
          ? 'FAILED'
          : 'READY'
        : state === 'failed'
          ? 'FAILED'
          : state === 'active'
            ? 'RUNNING'
            : 'QUEUED';
    return toJobDto(
      job.id!,
      data.kind,
      status,
      progress,
      result?.downloadUrl ?? null,
      result?.error ?? (state === 'failed' ? String(job.failedReason) : null),
      new Date(job.timestamp),
      job.finishedOn ? new Date(job.finishedOn) : null,
    );
  }
}

function sanitizeZipName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'media-export';
}

function toJobDto(
  id: string,
  kind: MediaExportJobDto['kind'],
  status: MediaExportJobDto['status'],
  progress: number,
  downloadUrl: string | null,
  error: string | null,
  createdAt: Date,
  completedAt: Date | null = null,
): MediaExportJobDto {
  return {
    id,
    kind,
    status,
    progress,
    downloadUrl,
    error,
    createdAt: createdAt.toISOString(),
    completedAt: completedAt?.toISOString() ?? null,
  };
}
