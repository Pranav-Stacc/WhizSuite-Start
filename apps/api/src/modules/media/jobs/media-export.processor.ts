import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { PassThrough } from 'node:stream';
import type { AppConfig } from '../../../shared/config/app.config';
import { StorageService } from '../../../shared/storage/storage.service';
import { ErrorCodes } from '@agency-os/contracts';
import { GoogleDriveClient } from '../../integrations/providers/google-drive.client';
import { GoogleDriveTokenService } from '../../integrations/providers/google-drive-token.service';
import { IntegrationsRepository } from '../../integrations/infrastructure/repositories/integrations.repository';
import { MediaStorageService } from '../application/services/media-storage.service';
import { isMimeTypeAllowed } from '../application/utils/mime-type';
import { MediaRepository } from '../infrastructure/repositories/media.repository';
import {
  MEDIA_EXPORT_QUEUE,
  type MediaExportJobPayload,
  type MediaExportJobResult,
} from './media-export.queue';

type ArchiverFactory = (
  format: string,
  options?: { zlib?: { level?: number } },
) => {
  pipe: (stream: PassThrough) => void;
  append: (data: Buffer, opts: { name: string }) => void;
  finalize: () => Promise<void>;
  on: (event: string, cb: (err: Error) => void) => void;
};

// CommonJS export — typed loosely so Nest/TS don't fight `export =`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createArchive = require('archiver') as ArchiverFactory;

@Processor(MEDIA_EXPORT_QUEUE)
export class MediaExportProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaExportProcessor.name);

  constructor(
    private readonly repository: MediaRepository,
    private readonly storage: StorageService,
    private readonly integrations: IntegrationsRepository,
    private readonly drive: GoogleDriveClient,
    private readonly driveTokens: GoogleDriveTokenService,
    private readonly mediaStorage: MediaStorageService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    super();
  }

  async process(
    job: Job<MediaExportJobPayload, MediaExportJobResult>,
  ): Promise<MediaExportJobResult> {
    try {
      if (job.data.kind === 'ZIP') {
        return await this.runZip(job);
      }
      if (job.data.kind === 'DRIVE_IMPORT') {
        return await this.runDriveImport(job);
      }
      return await this.runDriveTransfer(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      this.logger.error(`Export job ${job.id} failed: ${message}`);
      return { downloadUrl: null, error: message, transferred: 0 };
    }
  }

  private async runZip(
    job: Job<MediaExportJobPayload, MediaExportJobResult>,
  ): Promise<MediaExportJobResult> {
    const data = job.data;
    if (data.kind !== 'ZIP') throw new Error('Invalid zip payload');
    const assets = await this.repository.findReadyByIds(
      data.organizationId,
      data.assetIds,
    );
    const archive = createArchive('zip', { zlib: { level: 5 } });
    const chunks: Buffer[] = [];
    const sink = new PassThrough();
    sink.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve, reject) => {
      sink.on('finish', () => resolve(Buffer.concat(chunks)));
      sink.on('error', reject);
      archive.on('error', reject);
    });
    archive.pipe(sink);

    let index = 0;
    for (const asset of assets) {
      const key = await this.repository.findCurrentStorageKey(
        data.organizationId,
        asset,
      );
      if (!key) continue;
      const bytes = await this.storage.getObjectBytes(key);
      archive.append(bytes, { name: uniqueEntryName(asset.name, index) });
      index += 1;
      await job.updateProgress(Math.round((index / assets.length) * 90));
    }
    await archive.finalize();
    const zipBuffer = await done;

    const stored = await this.storage.putObject({
      organizationId: data.organizationId,
      filename: `${data.filename}.zip`,
      mimeType: 'application/zip',
      body: zipBuffer,
    });
    const download = await this.storage.createPresignedDownload(
      stored.storageKey,
      { filename: `${data.filename}.zip`, disposition: 'attachment' },
    );
    await job.updateProgress(100);
    return {
      downloadUrl: download.url,
      error: null,
      transferred: index,
    };
  }

  private async runDriveTransfer(
    job: Job<MediaExportJobPayload, MediaExportJobResult>,
  ): Promise<MediaExportJobResult> {
    const data = job.data;
    if (data.kind !== 'DRIVE_TRANSFER')
      throw new Error('Invalid drive payload');
    const connection = await this.integrations.findById(
      data.organizationId,
      data.connectionId,
    );
    if (!connection || connection.status !== 'CONNECTED') {
      return {
        downloadUrl: null,
        error: 'Google Drive is not connected',
        transferred: 0,
      };
    }
    const accessToken = await this.driveTokens.resolveAccessToken(
      data.organizationId,
      connection.id,
    );
    if (!accessToken) {
      return {
        downloadUrl: null,
        error: 'Missing Drive credentials',
        transferred: 0,
      };
    }

    const assets = data.transferAll
      ? await this.repository.listReady(
          data.organizationId,
          this.config.get('MEDIA_LIST_LIMIT', { infer: true }),
        )
      : await this.repository.findReadyByIds(
          data.organizationId,
          data.assetIds,
        );

    let transferred = 0;
    for (const asset of assets) {
      const key = await this.repository.findCurrentStorageKey(
        data.organizationId,
        asset,
      );
      if (!key) continue;
      const bytes = await this.storage.getObjectBytes(key);
      await this.drive.uploadFile({
        accessToken,
        name: asset.name,
        mimeType: asset.mimeType,
        body: bytes,
        folderId: data.driveFolderId,
      });
      transferred += 1;
      await job.updateProgress(
        Math.round((transferred / Math.max(assets.length, 1)) * 100),
      );
    }
    return { downloadUrl: null, error: null, transferred };
  }

  private async runDriveImport(
    job: Job<MediaExportJobPayload, MediaExportJobResult>,
  ): Promise<MediaExportJobResult> {
    const data = job.data;
    if (data.kind !== 'DRIVE_IMPORT') throw new Error('Invalid import payload');

    const connection = await this.integrations.findById(
      data.organizationId,
      data.connectionId,
    );
    if (!connection || connection.status !== 'CONNECTED') {
      return {
        downloadUrl: null,
        error: 'Google Drive is not connected',
        transferred: 0,
      };
    }

    const accessToken = await this.driveTokens.resolveAccessToken(
      data.organizationId,
      connection.id,
    );
    if (!accessToken) {
      return {
        downloadUrl: null,
        error: 'Missing Drive credentials',
        transferred: 0,
      };
    }

    const allowedMimeTypes = this.config.get('STORAGE_ALLOWED_MIME_TYPES', {
      infer: true,
    });
    const maxBytes = this.config.get('STORAGE_UPLOAD_MAX_BYTES', { infer: true });
    const errors: string[] = [];
    let transferred = 0;

    for (const [index, fileId] of data.driveFileIds.entries()) {
      try {
        const downloaded = await this.drive.downloadFile(accessToken, fileId);
        const mimeType = downloaded.mimeType.toLowerCase();
        if (!isMimeTypeAllowed(mimeType, allowedMimeTypes)) {
          throw new Error(`File type ${mimeType} is not allowed`);
        }
        if (downloaded.body.byteLength > maxBytes) {
          throw new Error(`File exceeds the ${maxBytes} byte limit`);
        }
        if (
          !(await this.mediaStorage.canAccept(
            data.organizationId,
            downloaded.body.byteLength,
          ))
        ) {
          throw new Error(ErrorCodes.MEDIA_STORAGE_LIMIT_EXCEEDED);
        }

        const stored = await this.storage.putObject({
          organizationId: data.organizationId,
          filename: downloaded.name,
          mimeType,
          body: downloaded.body,
        });
        const asset = await this.repository.createWithVersion(data.organizationId, {
          name: downloaded.name,
          mimeType,
          sizeBytes: stored.sizeBytes,
          storageKey: stored.storageKey,
          createdById: data.actorId,
          clientId: data.clientId,
          folderId: data.folderId,
        });
        await this.repository.setStatus(data.organizationId, asset.id, 'READY');
        transferred += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Drive import failed';
        errors.push(`${fileId}: ${message}`);
      }
      await job.updateProgress(
        Math.round(((index + 1) / data.driveFileIds.length) * 100),
      );
    }

    if (transferred === 0) {
      return {
        downloadUrl: null,
        error: errors[0] ?? 'No files imported',
        transferred: 0,
      };
    }

    if (errors.length > 0) {
      this.logger.warn(
        `Drive import ${job.id} imported ${transferred}/${data.driveFileIds.length}: ${errors.join('; ')}`,
      );
    }

    return {
      downloadUrl: null,
      error: null,
      transferred,
    };
  }
}

function uniqueEntryName(name: string, index: number): string {
  const safe = name.replace(/[\\/]+/g, '_');
  if (index === 0) return safe;
  const dot = safe.lastIndexOf('.');
  if (dot <= 0) return `${safe}-${index}`;
  return `${safe.slice(0, dot)}-${index}${safe.slice(dot)}`;
}
