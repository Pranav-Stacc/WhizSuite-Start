import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppConfig } from '../config/app.config';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private bucketReady = false;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.client = new S3Client({
      endpoint: this.config.get('STORAGE_ENDPOINT'),
      region: this.config.get('STORAGE_REGION'),
      credentials: {
        accessKeyId: this.config.get('STORAGE_ACCESS_KEY'),
        secretAccessKey: this.config.get('STORAGE_SECRET_KEY'),
      },
      forcePathStyle: this.config.get('STORAGE_FORCE_PATH_STYLE'),
    });
  }

  async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    const bucket = this.config.get('STORAGE_BUCKET');
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
    this.bucketReady = true;
  }

  buildObjectKey(organizationId: string, filename: string): string {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `orgs/${organizationId}/media/${Date.now()}-${safeName}`;
  }

  async createPresignedUpload(input: {
    organizationId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    expiresInSeconds?: number;
  }) {
    await this.ensureBucket();
    const key = this.buildObjectKey(input.organizationId, input.filename);
    const command = new PutObjectCommand({
      Bucket: this.config.get('STORAGE_BUCKET'),
      Key: key,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds ?? 900,
    });
    return {
      uploadUrl,
      storageKey: key,
      bucket: this.config.get('STORAGE_BUCKET'),
      expiresInSeconds: input.expiresInSeconds ?? 900,
    };
  }
}
