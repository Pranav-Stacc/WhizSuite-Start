import type { ConfigService } from '@nestjs/config';
import { ErrorCodes } from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import type { StorageService } from '../../../../shared/storage/storage.service';
import type { AuditService } from '../../../audit/application/services/audit.service';
import type { MediaRepository } from '../../infrastructure/repositories/media.repository';
import type { MediaAssetRecord } from '../mappers/media-asset.mapper';
import { MediaService } from './media.service';

const ORG = '00000000-0000-4000-8000-000000000001';
const ACTOR = '00000000-0000-4000-8000-000000000002';
const ASSET_ID = '00000000-0000-4000-8000-000000000003';
const KEY = `orgs/${ORG}/media/k/photo.png`;
const SIZE = 1024;

const configValues: Partial<Record<keyof AppConfig, unknown>> = {
  STORAGE_ALLOWED_MIME_TYPES: ['image/*', 'application/pdf'],
  STORAGE_UPLOAD_MAX_BYTES: 10 * SIZE,
  MEDIA_LIST_LIMIT: 50,
};

function asset(overrides: Partial<MediaAssetRecord> = {}): MediaAssetRecord {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    id: ASSET_ID,
    organizationId: ORG,
    clientId: null,
    folderId: null,
    projectId: null,
    calendarItemId: null,
    name: 'photo.png',
    mimeType: 'image/png',
    sizeBytes: BigInt(SIZE),
    status: 'PENDING_UPLOAD',
    currentVersion: 1,
    createdById: ACTOR,
    createdAt: now,
    updatedAt: now,
    tags: [],
    ...overrides,
  };
}

function setup() {
  const repository = {
    list: jest.fn(),
    findById: jest.fn().mockResolvedValue(asset()),
    findForEmbedding: jest.fn().mockResolvedValue([]),
    findCurrentStorageKey: jest.fn().mockResolvedValue(KEY),
    findAllStorageKeys: jest.fn().mockResolvedValue([KEY]),
    createWithVersion: jest.fn().mockResolvedValue(asset()),
    update: jest.fn(),
    setStatus: jest.fn(),
    softDelete: jest.fn(),
    setAssetTags: jest.fn().mockResolvedValue([]),
    recordUsage: jest.fn(),
  };
  const storage = {
    createPresignedUpload: jest.fn().mockResolvedValue({
      uploadUrl: 'https://s3/upload',
      storageKey: KEY,
      headers: { 'content-type': 'image/png' },
      expiresInSeconds: 900,
    }),
    createPresignedDownload: jest
      .fn()
      .mockResolvedValue({ url: 'https://s3/get', expiresInSeconds: 300 }),
    getObjectMetadata: jest
      .fn()
      .mockResolvedValue({ sizeBytes: SIZE, contentType: 'image/png' }),
    deleteObjects: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const config = { get: (key: keyof AppConfig) => configValues[key] };
  const service = new MediaService(
    repository as unknown as MediaRepository,
    audit as unknown as AuditService,
    storage as unknown as StorageService,
    config as unknown as ConfigService<AppConfig, true>,
  );
  return { service, repository, storage, audit };
}

async function expectProblem(promise: Promise<unknown>, code: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  expect(
    JSON.stringify((error as ProblemDetailsException).getResponse()),
  ).toContain(code);
}

describe('MediaService', () => {
  describe('createPresignedUpload', () => {
    it('rejects disallowed file types', async () => {
      const { service, storage } = setup();
      await expectProblem(
        service.createPresignedUpload(ORG, ACTOR, {
          filename: 'a.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: SIZE,
        }),
        ErrorCodes.MEDIA_TYPE_NOT_ALLOWED,
      );
      expect(storage.createPresignedUpload).not.toHaveBeenCalled();
    });

    it('rejects files over the size limit', async () => {
      const { service } = setup();
      await expectProblem(
        service.createPresignedUpload(ORG, ACTOR, {
          filename: 'a.png',
          mimeType: 'image/png',
          sizeBytes: 11 * SIZE,
        }),
        ErrorCodes.MEDIA_TOO_LARGE,
      );
    });

    it('returns a PUT url and a JSON-safe asset, and audits', async () => {
      const { service, audit } = setup();
      const result = await service.createPresignedUpload(ORG, ACTOR, {
        filename: 'photo.png',
        mimeType: 'IMAGE/PNG',
        sizeBytes: SIZE,
      });
      expect(result).toMatchObject({
        method: 'PUT',
        uploadUrl: 'https://s3/upload',
        asset: { sizeBytes: SIZE },
      });
      expect(() => JSON.stringify(result)).not.toThrow();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'media/assets.presign' }),
      );
    });
  });

  describe('completeUpload', () => {
    it('marks the asset READY when the object exists with the expected size', async () => {
      const { service, repository } = setup();
      repository.findById
        .mockResolvedValueOnce(asset())
        .mockResolvedValueOnce(asset({ status: 'READY' }));
      const result = await service.completeUpload(ORG, ACTOR, ASSET_ID);
      expect(repository.setStatus).toHaveBeenCalledWith(ORG, ASSET_ID, 'READY');
      expect(result.status).toBe('READY');
    });

    it('fails with MEDIA_UPLOAD_INCOMPLETE when the object is missing', async () => {
      const { service, storage, repository } = setup();
      storage.getObjectMetadata.mockResolvedValue(null);
      await expectProblem(
        service.completeUpload(ORG, ACTOR, ASSET_ID),
        ErrorCodes.MEDIA_UPLOAD_INCOMPLETE,
      );
      expect(repository.setStatus).not.toHaveBeenCalled();
    });

    it('marks FAILED and deletes the object on size mismatch', async () => {
      const { service, storage, repository } = setup();
      storage.getObjectMetadata.mockResolvedValue({
        sizeBytes: SIZE + 1,
        contentType: 'image/png',
      });
      await expectProblem(
        service.completeUpload(ORG, ACTOR, ASSET_ID),
        ErrorCodes.MEDIA_UPLOAD_INCOMPLETE,
      );
      expect(repository.setStatus).toHaveBeenCalledWith(
        ORG,
        ASSET_ID,
        'FAILED',
      );
      expect(storage.deleteObjects).toHaveBeenCalledWith([KEY]);
    });
  });

  describe('createDownloadUrl', () => {
    it('refuses assets that are not READY', async () => {
      const { service } = setup();
      await expectProblem(
        service.createDownloadUrl(ORG, ACTOR, ASSET_ID, 'inline'),
        ErrorCodes.MEDIA_NOT_READY,
      );
    });

    it('returns a signed url for READY assets', async () => {
      const { service, repository } = setup();
      repository.findById.mockResolvedValue(asset({ status: 'READY' }));
      await expect(
        service.createDownloadUrl(ORG, ACTOR, ASSET_ID, 'attachment'),
      ).resolves.toEqual({
        url: 'https://s3/get',
        expiresInSeconds: 300,
      });
    });
  });

  describe('list', () => {
    const PDF_ID = '00000000-0000-4000-8000-000000000005';

    it('adds preview urls only for ready images and videos, in one batch', async () => {
      const { service, repository } = setup();
      repository.list.mockResolvedValue([
        asset({ status: 'READY' }),
        asset({ id: PDF_ID, status: 'READY', mimeType: 'application/pdf' }),
      ]);
      repository.findForEmbedding.mockResolvedValue([
        {
          id: ASSET_ID,
          name: 'photo.png',
          mimeType: 'image/png',
          status: 'READY',
          currentVersion: 1,
          versions: [{ version: 1, storageKey: KEY }],
        },
      ]);

      const result = await service.list(ORG);

      expect(repository.findForEmbedding).toHaveBeenCalledWith(ORG, [ASSET_ID]);
      expect(result.map((a) => a.previewUrl)).toEqual(['https://s3/get', null]);
    });
  });

  describe('resolveForEmbedding', () => {
    const PENDING_ID = '00000000-0000-4000-8000-000000000004';

    it('skips the query for an empty list', async () => {
      const { service, repository } = setup();
      await expect(service.resolveForEmbedding(ORG, [])).resolves.toEqual(
        new Map(),
      );
      expect(repository.findForEmbedding).not.toHaveBeenCalled();
    });

    it('batch-loads assets once and signs inline urls only for READY ones', async () => {
      const { service, repository, storage } = setup();
      repository.findForEmbedding.mockResolvedValue([
        {
          id: ASSET_ID,
          name: 'photo.png',
          mimeType: 'image/png',
          status: 'READY',
          currentVersion: 2,
          versions: [
            { version: 1, storageKey: 'old' },
            { version: 2, storageKey: KEY },
          ],
        },
        {
          id: PENDING_ID,
          name: 'b.png',
          mimeType: 'image/png',
          status: 'PENDING_UPLOAD',
          currentVersion: 1,
          versions: [{ version: 1, storageKey: 'pending' }],
        },
      ]);

      const result = await service.resolveForEmbedding(ORG, [
        ASSET_ID,
        PENDING_ID,
        ASSET_ID,
      ]);

      expect(repository.findForEmbedding).toHaveBeenCalledTimes(1);
      expect(repository.findForEmbedding).toHaveBeenCalledWith(ORG, [
        ASSET_ID,
        PENDING_ID,
      ]);
      expect(storage.createPresignedDownload).toHaveBeenCalledTimes(1);
      expect(storage.createPresignedDownload).toHaveBeenCalledWith(KEY, {
        filename: 'photo.png',
        disposition: 'inline',
      });
      expect(result.get(ASSET_ID)).toEqual({
        assetId: ASSET_ID,
        name: 'photo.png',
        mimeType: 'image/png',
        status: 'READY',
        url: 'https://s3/get',
      });
      expect(result.get(PENDING_ID)?.url).toBeNull();
    });
  });

  describe('remove', () => {
    it('soft deletes, audits and removes every stored object', async () => {
      const { service, repository, storage, audit } = setup();
      await service.remove(ORG, ACTOR, ASSET_ID);
      expect(repository.softDelete).toHaveBeenCalledWith(ORG, ASSET_ID);
      expect(storage.deleteObjects).toHaveBeenCalledWith([KEY]);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'media/assets.delete' }),
      );
    });
  });
});
