import type { ConfigService } from '@nestjs/config';
import {
  DomainEventTypes,
  ErrorCodes,
  type EmbeddedMediaDto,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import type { OutboxService } from '../../../../shared/events/outbox.service';
import type { AuditService } from '../../../audit/application/services/audit.service';
import type { MediaService } from '../../../media/application/services/media.service';
import type { SocialRepository } from '../../infrastructure/repositories/social.repository';
import {
  toContentSnapshot,
  type ContentItemRecord,
} from '../mappers/content-item.mapper';
import { SocialService } from './social.service';

const ORG = '00000000-0000-4000-8000-000000000001';
const ACTOR = '00000000-0000-4000-8000-000000000002';
const CONTENT_ID = '00000000-0000-4000-8000-000000000003';
const CLIENT_ID = '00000000-0000-4000-8000-000000000004';
const ASSET_A = '00000000-0000-4000-8000-00000000000a';
const ASSET_B = '00000000-0000-4000-8000-00000000000b';
const OTHER_ID = '00000000-0000-4000-8000-000000000005';
const TX = { tx: true };

const configValues: Partial<Record<keyof AppConfig, unknown>> = {
  CONTENT_LIST_LIMIT: 500,
  CONTENT_MEDIA_MAX: 2,
  CONTENT_HASHTAGS_MAX: 3,
  CONTENT_REORDER_MAX: 2,
};

function record(overrides: Partial<ContentItemRecord> = {}): ContentItemRecord {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    id: CONTENT_ID,
    organizationId: ORG,
    clientId: CLIENT_ID,
    title: 'Launch post',
    caption: null,
    contentType: 'STATIC_POST',
    status: 'DRAFT',
    pillar: null,
    platforms: [],
    hashtags: [],
    ctaUrl: null,
    scheduledAt: null,
    gridPosition: null,
    currentVersion: 1,
    createdById: ACTOR,
    createdAt: now,
    updatedAt: now,
    version: 1,
    media: [],
    ...overrides,
  };
}

function embedded(
  assetId: string,
  status: EmbeddedMediaDto['status'] = 'READY',
): EmbeddedMediaDto {
  return {
    assetId,
    name: `${assetId}.png`,
    mimeType: 'image/png',
    status,
    url: status === 'READY' ? `https://s3/${assetId}` : null,
  };
}

function mediaMap(...assets: EmbeddedMediaDto[]) {
  return new Map(assets.map((a) => [a.assetId, a]));
}

function setup() {
  const repository = {
    transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(TX)),
    listContent: jest.fn().mockResolvedValue([]),
    findContent: jest.fn().mockResolvedValue(record()),
    insertContent: jest.fn(),
    updateContentIfVersion: jest.fn().mockResolvedValue(1),
    replaceMedia: jest.fn(),
    insertVersionSnapshot: jest.fn(),
    softDeleteContent: jest.fn().mockResolvedValue(1),
    cancelQueuedPublishJobs: jest.fn(),
    applyGridOrder: jest.fn(),
    recordStateHistory: jest.fn(),
  };
  const outbox = { write: jest.fn() };
  const audit = { record: jest.fn() };
  const media = { resolveForEmbedding: jest.fn().mockResolvedValue(new Map()) };
  const config = { get: (key: keyof AppConfig) => configValues[key] };
  const service = new SocialService(
    repository as unknown as SocialRepository,
    outbox as unknown as OutboxService,
    audit as unknown as AuditService,
    media as unknown as MediaService,
    config as unknown as ConfigService<AppConfig, true>,
  );
  return { service, repository, outbox, audit, media };
}

async function expectProblem(
  promise: Promise<unknown>,
  code: string,
  status?: number,
) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const exception = error as ProblemDetailsException;
  expect(exception.problem.code).toBe(code);
  if (status !== undefined) expect(exception.getStatus()).toBe(status);
}

const createInput = {
  clientId: CLIENT_ID,
  title: 'Launch post',
  contentType: 'STATIC_POST' as const,
};

describe('SocialService', () => {
  describe('createContent', () => {
    it('rejects media that does not exist in the organization', async () => {
      const { service, media, repository } = setup();
      media.resolveForEmbedding.mockResolvedValue(mediaMap(embedded(ASSET_A)));
      await expectProblem(
        service.createContent(ORG, ACTOR, {
          ...createInput,
          mediaAssetIds: [ASSET_A, ASSET_B],
        }),
        ErrorCodes.NOT_FOUND,
        404,
      );
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it('rejects media that is not READY with 422', async () => {
      const { service, media, repository } = setup();
      media.resolveForEmbedding.mockResolvedValue(
        mediaMap(embedded(ASSET_A, 'PENDING_UPLOAD')),
      );
      await expectProblem(
        service.createContent(ORG, ACTOR, {
          ...createInput,
          mediaAssetIds: [ASSET_A],
        }),
        ErrorCodes.MEDIA_NOT_READY,
        422,
      );
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it('rejects more media than the configured maximum', async () => {
      const { service, media } = setup();
      await expectProblem(
        service.createContent(ORG, ACTOR, {
          ...createInput,
          mediaAssetIds: [ASSET_A, ASSET_B, OTHER_ID],
        }),
        ErrorCodes.VALIDATION_FAILED,
        400,
      );
      expect(media.resolveForEmbedding).not.toHaveBeenCalled();
    });

    it('creates with ordered media, normalized hashtags, a v1 snapshot, an event and an audit record', async () => {
      const { service, media, repository, outbox, audit } = setup();
      media.resolveForEmbedding.mockResolvedValue(
        mediaMap(embedded(ASSET_A), embedded(ASSET_B)),
      );
      const created = record({
        hashtags: ['#launch', '#news'],
        media: [
          { mediaAssetId: ASSET_B, position: 1 },
          { mediaAssetId: ASSET_A, position: 0 },
        ],
      });
      repository.insertContent.mockResolvedValue(created);

      const result = await service.createContent(ORG, ACTOR, {
        ...createInput,
        hashtags: ['launch', '#news', '#Launch'],
        mediaAssetIds: [ASSET_A, ASSET_B],
      });

      expect(repository.insertContent).toHaveBeenCalledWith(
        TX,
        ORG,
        expect.objectContaining({
          status: 'DRAFT',
          hashtags: ['#launch', '#news'],
          mediaAssetIds: [ASSET_A, ASSET_B],
          scheduledAt: null,
          createdById: ACTOR,
        }),
      );
      expect(repository.insertVersionSnapshot).toHaveBeenCalledWith(
        TX,
        ORG,
        CONTENT_ID,
        1,
        expect.objectContaining({ mediaAssetIds: [ASSET_A, ASSET_B] }),
        ACTOR,
      );
      expect(outbox.write).toHaveBeenCalledWith(
        expect.objectContaining({ type: DomainEventTypes.CONTENT_CREATED }),
        TX,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'social/content.create' }),
      );
      expect(result.media.map((m) => [m.assetId, m.position, m.url])).toEqual([
        [ASSET_A, 0, `https://s3/${ASSET_A}`],
        [ASSET_B, 1, `https://s3/${ASSET_B}`],
      ]);
    });
  });

  describe('updateContent', () => {
    it('returns 409 CONTENT_VERSION_CONFLICT when expectedVersion is stale', async () => {
      const { service, repository } = setup();
      repository.findContent.mockResolvedValue(record({ version: 3 }));
      await expectProblem(
        service.updateContent(ORG, ACTOR, CONTENT_ID, {
          title: 'New',
          expectedVersion: 2,
        }),
        ErrorCodes.CONTENT_VERSION_CONFLICT,
        409,
      );
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it('returns 409 when the row changed between read and write', async () => {
      const { service, repository, outbox } = setup();
      repository.updateContentIfVersion.mockResolvedValue(0);
      await expectProblem(
        service.updateContent(ORG, ACTOR, CONTENT_ID, { title: 'New' }),
        ErrorCodes.CONTENT_VERSION_CONFLICT,
      );
      expect(outbox.write).not.toHaveBeenCalled();
    });

    it('replaces the media list inside the transaction and snapshots, emits and audits', async () => {
      const { service, repository, media, outbox, audit } = setup();
      const before = record({
        media: [{ mediaAssetId: ASSET_A, position: 0 }],
      });
      const after = record({
        version: 2,
        currentVersion: 2,
        title: 'New',
        media: [
          { mediaAssetId: ASSET_B, position: 0 },
          { mediaAssetId: ASSET_A, position: 1 },
        ],
      });
      repository.findContent
        .mockResolvedValueOnce(before)
        .mockResolvedValueOnce(after);
      media.resolveForEmbedding.mockResolvedValue(
        mediaMap(embedded(ASSET_A), embedded(ASSET_B)),
      );

      const result = await service.updateContent(ORG, ACTOR, CONTENT_ID, {
        title: 'New',
        mediaAssetIds: [ASSET_B, ASSET_A],
        expectedVersion: 1,
      });

      expect(repository.updateContentIfVersion).toHaveBeenCalledWith(
        TX,
        ORG,
        CONTENT_ID,
        1,
        expect.objectContaining({ title: 'New' }),
        { newSnapshot: true },
      );
      expect(repository.replaceMedia).toHaveBeenCalledWith(
        TX,
        ORG,
        CONTENT_ID,
        [ASSET_B, ASSET_A],
      );
      expect(repository.insertVersionSnapshot).toHaveBeenCalledWith(
        TX,
        ORG,
        CONTENT_ID,
        2,
        expect.objectContaining({
          title: 'New',
          mediaAssetIds: [ASSET_B, ASSET_A],
        }),
        ACTOR,
      );
      const changedFields = ['title', 'mediaAssetIds'];
      expect(outbox.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DomainEventTypes.CONTENT_UPDATED,
          payload: {
            contentId: CONTENT_ID,
            clientId: CLIENT_ID,
            version: 2,
            changedFields,
          },
        }),
        TX,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'social/content.update',
          before: toContentSnapshot(before),
          after: toContentSnapshot(after),
        }),
      );
      expect(toContentSnapshot(after).mediaAssetIds).toEqual([
        ASSET_B,
        ASSET_A,
      ]);
      expect(media.resolveForEmbedding).toHaveBeenCalledTimes(1);
      expect(result.media.map((m) => m.assetId)).toEqual([ASSET_B, ASSET_A]);
    });

    it('leaves media untouched when mediaAssetIds is omitted', async () => {
      const { service, repository } = setup();
      await service.updateContent(ORG, ACTOR, CONTENT_ID, { caption: null });
      expect(repository.replaceMedia).not.toHaveBeenCalled();
      expect(repository.updateContentIfVersion).toHaveBeenCalledWith(
        TX,
        ORG,
        CONTENT_ID,
        1,
        expect.objectContaining({ caption: null, scheduledAt: undefined }),
        { newSnapshot: true },
      );
    });
  });

  describe('reorderContent', () => {
    it('rejects with 422 when an id does not belong to the client', async () => {
      const { service, repository, audit } = setup();
      repository.applyGridOrder.mockResolvedValue(1);
      await expectProblem(
        service.reorderContent(ORG, ACTOR, {
          clientId: CLIENT_ID,
          orderedIds: [CONTENT_ID, OTHER_ID],
        }),
        ErrorCodes.VALIDATION_FAILED,
        422,
      );
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('rejects more ids than the configured maximum', async () => {
      const { service, repository } = setup();
      await expectProblem(
        service.reorderContent(ORG, ACTOR, {
          clientId: CLIENT_ID,
          orderedIds: [CONTENT_ID, OTHER_ID, ASSET_A],
        }),
        ErrorCodes.VALIDATION_FAILED,
        400,
      );
      expect(repository.applyGridOrder).not.toHaveBeenCalled();
    });

    it('applies the order in a transaction and audits', async () => {
      const { service, repository, audit } = setup();
      repository.applyGridOrder.mockResolvedValue(2);
      await service.reorderContent(ORG, ACTOR, {
        clientId: CLIENT_ID,
        orderedIds: [OTHER_ID, CONTENT_ID],
      });
      expect(repository.applyGridOrder).toHaveBeenCalledWith(
        TX,
        ORG,
        CLIENT_ID,
        [OTHER_ID, CONTENT_ID],
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'social/content.reorder' }),
      );
    });
  });

  describe('deleteContent', () => {
    it('soft deletes, cancels queued publish jobs, emits and audits', async () => {
      const { service, repository, outbox, audit } = setup();
      await service.deleteContent(ORG, ACTOR, CONTENT_ID);
      expect(repository.softDeleteContent).toHaveBeenCalledWith(
        TX,
        ORG,
        CONTENT_ID,
      );
      expect(repository.cancelQueuedPublishJobs).toHaveBeenCalledWith(
        TX,
        ORG,
        CONTENT_ID,
      );
      expect(outbox.write).toHaveBeenCalledWith(
        expect.objectContaining({ type: DomainEventTypes.CONTENT_DELETED }),
        TX,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'social/content.delete' }),
      );
    });

    it('returns 404 for unknown content', async () => {
      const { service, repository } = setup();
      repository.findContent.mockResolvedValue(null);
      await expectProblem(
        service.deleteContent(ORG, ACTOR, CONTENT_ID),
        ErrorCodes.NOT_FOUND,
        404,
      );
      expect(repository.softDeleteContent).not.toHaveBeenCalled();
    });
  });

  describe('listContent', () => {
    it('resolves media for the whole page in a single batch call', async () => {
      const { service, repository, media } = setup();
      repository.listContent.mockResolvedValue([
        record({ media: [{ mediaAssetId: ASSET_A, position: 0 }] }),
        record({
          id: OTHER_ID,
          media: [{ mediaAssetId: ASSET_B, position: 0 }],
        }),
      ]);
      media.resolveForEmbedding.mockResolvedValue(
        mediaMap(embedded(ASSET_A), embedded(ASSET_B)),
      );

      const result = await service.listContent(ORG, {
        clientId: CLIENT_ID,
        from: '2026-01-01T00:00:00Z',
      });

      expect(media.resolveForEmbedding).toHaveBeenCalledTimes(1);
      expect(media.resolveForEmbedding).toHaveBeenCalledWith(ORG, [
        ASSET_A,
        ASSET_B,
      ]);
      expect(repository.listContent).toHaveBeenCalledWith(
        ORG,
        expect.objectContaining({
          clientId: CLIENT_ID,
          from: new Date('2026-01-01T00:00:00Z'),
          to: undefined,
        }),
        500,
      );
      expect(result).toHaveLength(2);
    });
  });
});
