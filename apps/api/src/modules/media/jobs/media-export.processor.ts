import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { PassThrough } from 'node:stream';
import type { AppConfig } from '../../../shared/config/app.config';
import { StorageService } from '../../../shared/storage/storage.service';
import { GoogleDriveClient } from '../../integrations/providers/google-drive.client';
import { IntegrationsRepository } from '../../integrations/infrastructure/repositories/integrations.repository';
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
    const accessToken = await this.resolveDriveAccessToken(
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

  private async resolveDriveAccessToken(
    organizationId: string,
    connectionId: string,
  ): Promise<string | null> {
    const creds = await this.integrations.findCredential(connectionId);
    if (!creds) return null;

    if (creds.refreshToken) {
      try {
        const refreshed = await this.drive.refreshAccessToken(
          creds.refreshToken,
        );
        const encryptedData = JSON.stringify({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? creds.refreshToken,
        });
        await this.integrations.upsertCredential(
          organizationId,
          connectionId,
          encryptedData,
          refreshed.expiresAt ? new Date(refreshed.expiresAt) : null,
        );
        return refreshed.accessToken;
      } catch (error) {
        this.logger.warn(
          `Drive token refresh failed, using stored access token: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    return creds.accessToken;
  }
}

function uniqueEntryName(name: string, index: number): string {
  const safe = name.replace(/[\\/]+/g, '_');
  if (index === 0) return safe;
  const dot = safe.lastIndexOf('.');
  if (dot <= 0) return `${safe}-${index}`;
  return `${safe.slice(0, dot)}-${index}${safe.slice(dot)}`;
}
