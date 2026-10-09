import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MediaDownloadDisposition } from '@agency-os/contracts';
import type { AppConfig } from '../config/app.config';

const S3_DELETE_BATCH_SIZE = 1000;
const HTTP_NOT_FOUND = 404;

export interface StoredObjectMetadata {
  sizeBytes: number;
  contentType: string | undefined;
}

export interface CopiedObjectResult {
  storageKey: string;
  contentHash: string;
  sizeBytes: number;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private bucketReady = false;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const accessKeyId = this.config.get('STORAGE_ACCESS_KEY', { infer: true });
    const secretAccessKey = this.config.get('STORAGE_SECRET_KEY', {
      infer: true,
    });
    this.bucket = this.config.get('STORAGE_BUCKET', { infer: true });
    this.client = new S3Client({
      endpoint: this.config.get('STORAGE_ENDPOINT', { infer: true }),
      region: this.config.get('STORAGE_REGION', { infer: true }),
      // Without static keys the SDK uses the default chain (e.g. the EC2 instance role).
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
      forcePathStyle: this.config.get('STORAGE_FORCE_PATH_STYLE', {
        infer: true,
      }),
      maxAttempts: this.config.get('STORAGE_MAX_ATTEMPTS', { infer: true }),
      requestHandler: {
        requestTimeout: this.config.get('STORAGE_REQUEST_TIMEOUT_MS', {
          infer: true,
        }),
        connectionTimeout: this.config.get('STORAGE_REQUEST_TIMEOUT_MS', {
          infer: true,
        }),
      },
    });
  }

  async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!isNotFound(error)) throw error;
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
    this.bucketReady = true;
  }

  buildObjectKey(organizationId: string, filename: string): string {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `orgs/${organizationId}/media/${randomUUID()}/${safeName}`;
  }

  async createPresignedUpload(input: {
    organizationId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    await this.ensureBucket();
    const storageKey = this.buildObjectKey(
      input.organizationId,
      input.filename,
    );
    const expiresInSeconds = this.config.get('STORAGE_UPLOAD_URL_TTL_SECONDS', {
      infer: true,
    });
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
    return {
      uploadUrl,
      storageKey,
      headers: { 'content-type': input.mimeType },
      expiresInSeconds,
    };
  }

  async createPresignedDownload(
    storageKey: string,
    options: { filename: string; disposition: MediaDownloadDisposition },
  ) {
    const expiresInSeconds = this.config.get(
      'STORAGE_DOWNLOAD_URL_TTL_SECONDS',
      { infer: true },
    );
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ResponseContentDisposition: contentDisposition(
        options.disposition,
        options.filename,
      ),
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
    return { url, expiresInSeconds };
  }

  async getObjectMetadata(
    storageKey: string,
  ): Promise<StoredObjectMetadata | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
      return {
        sizeBytes: head.ContentLength ?? 0,
        contentType: head.ContentType,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  /**
   * Copies an object to a new key and returns a SHA-256 of the bytes.
   * Used to freeze signed agreement PDFs at signing time.
   */
  async copyObjectImmutable(input: {
    sourceKey: string;
    organizationId: string;
    filename: string;
  }): Promise<CopiedObjectResult> {
    await this.ensureBucket();
    const storageKey = this.buildObjectKey(input.organizationId, input.filename);
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${input.sourceKey}`,
        Key: storageKey,
        MetadataDirective: 'COPY',
      }),
    );
    const object = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes?.length) {
      throw new Error(`Signed copy ${storageKey} is empty`);
    }
    return {
      storageKey,
      contentHash: createHash('sha256').update(bytes).digest('hex'),
      sizeBytes: bytes.byteLength,
    };
  }

  async deleteObjects(storageKeys: string[]): Promise<void> {
    for (
      let start = 0;
      start < storageKeys.length;
      start += S3_DELETE_BATCH_SIZE
    ) {
      const batch = storageKeys.slice(start, start + S3_DELETE_BATCH_SIZE);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }
}

function isNotFound(error: unknown): boolean {
  if (error instanceof NotFound) return true;
  return (
    error instanceof S3ServiceException &&
    error.$metadata.httpStatusCode === HTTP_NOT_FOUND
  );
}

function contentDisposition(
  disposition: MediaDownloadDisposition,
  filename: string,
): string {
  const asciiFallback = filename
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
