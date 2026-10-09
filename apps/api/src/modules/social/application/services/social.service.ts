import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DomainEventTypes,
  ErrorCodes,
  normalizeHashtags,
  type ContentItemCreateInput,
  type ContentItemDto,
  type ContentItemUpdateInput,
  type ContentListQuery,
  type ContentReorderInput,
  type ContentReviewOutcome,
  type ContentStatus,
  type EmbeddedMediaDto,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import {
  AuditService,
  type AuditRecordInput,
} from '../../../audit/application/services/audit.service';
import { MediaService } from '../../../media/application/services/media.service';
import {
  SocialRepository,
  type ContentFieldChanges,
  type SocialTx,
} from '../../infrastructure/repositories/social.repository';
import {
  collectMediaAssetIds,
  toContentItemDto,
  toContentSnapshot,
  type ContentItemRecord,
} from '../mappers/content-item.mapper';

const ENTITY_TYPE = 'contentItem';
const STATE_HISTORY_ENTITY_TYPE = 'CONTENT';
const DEFAULT_CREATE_STATUS: ContentStatus = 'DRAFT';
const INITIAL_SNAPSHOT_VERSION = 1;
const REVIEWABLE_STATUS: ContentStatus = 'IN_REVIEW';

type AuditDetails = Pick<AuditRecordInput, 'before' | 'after' | 'metadata'>;

@Injectable()
export class SocialService {
  constructor(
    private readonly repository: SocialRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly media: MediaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async listContent(
    organizationId: string,
    query: ContentListQuery,
  ): Promise<ContentItemDto[]> {
    const records = await this.repository.listContent(
      organizationId,
      {
        clientId: query.clientId,
        status: query.status,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
      this.config.get('CONTENT_LIST_LIMIT', { infer: true }),
    );
    const embedded = await this.media.resolveForEmbedding(
      organizationId,
      collectMediaAssetIds(records),
    );
    return records.map((record) => toContentItemDto(record, embedded));
  }

  async getContent(
    organizationId: string,
    id: string,
  ): Promise<ContentItemDto> {
    return this.toDto(
      organizationId,
      await this.findOrThrow(organizationId, id),
    );
  }

  async createContent(
    organizationId: string,
    actorId: string,
    input: ContentItemCreateInput,
  ): Promise<ContentItemDto> {
    const mediaAssetIds = input.mediaAssetIds ?? [];
    const hashtags = this.prepareHashtags(input.hashtags) ?? [];
    this.assertMediaCount(mediaAssetIds);
    const embedded = await this.resolveReadyMedia(
      organizationId,
      mediaAssetIds,
    );

    const created = await this.repository.transaction(async (tx) => {
      const item = await this.repository.insertContent(tx, organizationId, {
        clientId: input.clientId,
        projectId: input.projectId,
        campaignId: input.campaignId,
        title: input.title,
        caption: input.caption,
        contentType: input.contentType,
        status: input.status ?? DEFAULT_CREATE_STATUS,
        pillar: input.pillar,
        platforms: input.platforms ?? [],
        hashtags,
        ctaUrl: input.ctaUrl,
        scheduledAt: toDateOrNull(input.scheduledAt),
        createdById: actorId,
        mediaAssetIds,
      });
      await this.repository.insertVersionSnapshot(
        tx,
        organizationId,
        item.id,
        INITIAL_SNAPSHOT_VERSION,
        toContentSnapshot(item),
        actorId,
      );
      await this.writeEvent(
        tx,
        organizationId,
        actorId,
        DomainEventTypes.CONTENT_CREATED,
        {
          contentId: item.id,
          clientId: item.clientId,
        },
      );
      return item;
    });

    await this.record(
      organizationId,
      actorId,
      'social/content.create',
      created.id,
      {
        after: toContentSnapshot(created),
      },
    );
    return toContentItemDto(created, embedded);
  }

  async updateContent(
    organizationId: string,
    actorId: string,
    id: string,
    input: ContentItemUpdateInput,
  ): Promise<ContentItemDto> {
    const before = await this.findOrThrow(organizationId, id);
    if (
      input.expectedVersion !== undefined &&
      input.expectedVersion !== before.version
    ) {
      throw versionConflict();
    }
    const mediaAssetIds = input.mediaAssetIds;
    if (mediaAssetIds) this.assertMediaCount(mediaAssetIds);
    const replacedMedia = mediaAssetIds
      ? await this.resolveReadyMedia(organizationId, mediaAssetIds)
      : undefined;

    const changes: ContentFieldChanges = {
      title: input.title,
      caption: input.caption,
      contentType: input.contentType,
      pillar: input.pillar,
      platforms: input.platforms,
      hashtags: this.prepareHashtags(input.hashtags),
      ctaUrl: input.ctaUrl,
      scheduledAt:
        input.scheduledAt === undefined
          ? undefined
          : toDateOrNull(input.scheduledAt),
    };

    const after = await this.repository.transaction(async (tx) => {
      const updated = await this.repository.updateContentIfVersion(
        tx,
        organizationId,
        id,
        before.version,
        changes,
        {
          newSnapshot: true,
        },
      );
      if (updated === 0) throw versionConflict();
      if (mediaAssetIds)
        await this.repository.replaceMedia(
          tx,
          organizationId,
          id,
          mediaAssetIds,
        );
      const record = await this.requireInTx(tx, organizationId, id);
      await this.repository.insertVersionSnapshot(
        tx,
        organizationId,
        id,
        record.currentVersion,
        toContentSnapshot(record),
        actorId,
      );
      await this.writeEvent(
        tx,
        organizationId,
        actorId,
        DomainEventTypes.CONTENT_UPDATED,
        {
          contentId: id,
          clientId: record.clientId,
          version: record.version,
          changedFields: changedFieldNames(input),
        },
      );
      return record;
    });

    await this.record(organizationId, actorId, 'social/content.update', id, {
      before: toContentSnapshot(before),
      after: toContentSnapshot(after),
    });
    return replacedMedia
      ? toContentItemDto(after, replacedMedia)
      : this.toDto(organizationId, after);
  }

  async deleteContent(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<void> {
    const before = await this.findOrThrow(organizationId, id);
    await this.repository.transaction(async (tx) => {
      const deleted = await this.repository.softDeleteContent(
        tx,
        organizationId,
        id,
      );
      if (deleted === 0) throw notFound();
      await this.repository.cancelQueuedPublishJobs(tx, organizationId, id);
      await this.writeEvent(
        tx,
        organizationId,
        actorId,
        DomainEventTypes.CONTENT_DELETED,
        {
          contentId: id,
          clientId: before.clientId,
        },
      );
    });
    await this.record(organizationId, actorId, 'social/content.delete', id, {
      before: toContentSnapshot(before),
    });
  }

  async reorderContent(
    organizationId: string,
    actorId: string,
    input: ContentReorderInput,
  ): Promise<void> {
    const { clientId, orderedIds } = input;
    const max = this.config.get('CONTENT_REORDER_MAX', { infer: true });
    if (orderedIds.length > max) {
      throw badRequest(`At most ${max} items can be reordered at once`);
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw badRequest('orderedIds must not contain duplicates');
    }
    if (orderedIds.length > 0) {
      await this.repository.transaction(async (tx) => {
        const matched = await this.repository.applyGridOrder(
          tx,
          organizationId,
          clientId,
          orderedIds,
        );
        if (matched !== orderedIds.length) {
          throw unprocessable(
            'Every id must be a live content item of the given client',
          );
        }
      });
    }
    await this.record(
      organizationId,
      actorId,
      'social/content.reorder',
      undefined,
      {
        metadata: { clientId, orderedIds },
      },
    );
  }

  /** Reviewer decision: only moves content that is awaiting review to an outcome state. */
  async reviewContent(
    organizationId: string,
    actorId: string,
    contentId: string,
    toStatus: ContentReviewOutcome,
  ): Promise<ContentItemDto> {
    const current = await this.findOrThrow(organizationId, contentId);
    if (current.status !== REVIEWABLE_STATUS) {
      throw unprocessable('Content is not awaiting review');
    }
    return this.transitionContent(organizationId, actorId, contentId, toStatus);
  }

  async transitionContent(
    organizationId: string,
    actorId: string,
    contentId: string,
    toStatus: ContentStatus,
  ): Promise<ContentItemDto> {
    const before = await this.findOrThrow(organizationId, contentId);
    const after = await this.repository.transaction(async (tx) => {
      const updated = await this.repository.updateContentIfVersion(
        tx,
        organizationId,
        contentId,
        before.version,
        { status: toStatus },
        { newSnapshot: false },
      );
      if (updated === 0) throw versionConflict();
      await this.repository.recordStateHistory(tx, {
        organizationId,
        entityType: STATE_HISTORY_ENTITY_TYPE,
        entityId: contentId,
        fromState: before.status,
        toState: toStatus,
        actorId,
      });
      await this.writeEvent(
        tx,
        organizationId,
        actorId,
        DomainEventTypes.CONTENT_STATE_CHANGED,
        {
          contentId,
          fromStatus: before.status,
          toStatus,
        },
      );
      return this.requireInTx(tx, organizationId, contentId);
    });
    await this.record(
      organizationId,
      actorId,
      'social/content.transition',
      contentId,
      {
        before: { status: before.status },
        after: { status: toStatus },
      },
    );
    return this.toDto(organizationId, after);
  }

  async scheduleVariant(
    organizationId: string,
    actorId: string,
    variantId: string,
    scheduledAt: string,
  ) {
    const variant = await this.repository.scheduleVariant(
      organizationId,
      variantId,
      new Date(scheduledAt),
    );
    await this.repository.createPublishJob(
      organizationId,
      variantId,
      new Date(scheduledAt),
    );
    await this.outbox.write({
      type: DomainEventTypes.CONTENT_SCHEDULED,
      version: 1,
      organizationId,
      payload: { variantId, scheduledAt },
      actor: { id: actorId, type: 'user' },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'social/variants.schedule',
      entityType: 'contentVariant',
      entityId: variantId,
      after: { scheduledAt },
    });
    return variant;
  }

  listCampaigns(organizationId: string, clientId?: string) {
    return this.repository.listCampaigns(organizationId, clientId);
  }

  listAccounts(organizationId: string, clientId?: string) {
    return this.repository.listAccounts(organizationId, clientId);
  }

  private async findOrThrow(
    organizationId: string,
    id: string,
  ): Promise<ContentItemRecord> {
    const record = await this.repository.findContent(organizationId, id);
    if (!record) throw notFound();
    return record;
  }

  private async requireInTx(
    tx: SocialTx,
    organizationId: string,
    id: string,
  ): Promise<ContentItemRecord> {
    const record = await this.repository.findContent(organizationId, id, tx);
    if (!record) throw notFound();
    return record;
  }

  private async toDto(
    organizationId: string,
    record: ContentItemRecord,
  ): Promise<ContentItemDto> {
    const embedded = await this.media.resolveForEmbedding(
      organizationId,
      collectMediaAssetIds([record]),
    );
    return toContentItemDto(record, embedded);
  }

  /** Every id must exist in the organization and be READY; returns the resolved assets for the response. */
  private async resolveReadyMedia(
    organizationId: string,
    mediaAssetIds: string[],
  ): Promise<Map<string, EmbeddedMediaDto>> {
    const embedded = await this.media.resolveForEmbedding(
      organizationId,
      mediaAssetIds,
    );
    for (const assetId of mediaAssetIds) {
      const asset = embedded.get(assetId);
      if (!asset) throw notFound(`Media asset ${assetId} not found`);
      if (asset.status !== 'READY') {
        throw problem(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Unprocessable Entity',
          ErrorCodes.MEDIA_NOT_READY,
          `Media asset ${assetId} is not ready`,
        );
      }
    }
    return embedded;
  }

  private assertMediaCount(mediaAssetIds: string[]): void {
    const max = this.config.get('CONTENT_MEDIA_MAX', { infer: true });
    if (mediaAssetIds.length > max)
      throw badRequest(`At most ${max} media items are allowed`);
    if (new Set(mediaAssetIds).size !== mediaAssetIds.length) {
      throw badRequest('mediaAssetIds must not contain duplicates');
    }
  }

  private prepareHashtags(
    hashtags: string[] | undefined,
  ): string[] | undefined {
    if (hashtags === undefined) return undefined;
    const normalized = normalizeHashtags(hashtags);
    const max = this.config.get('CONTENT_HASHTAGS_MAX', { infer: true });
    if (normalized.length > max)
      throw badRequest(`At most ${max} hashtags are allowed`);
    return normalized;
  }

  private async writeEvent(
    tx: SocialTx,
    organizationId: string,
    actorId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.outbox.write(
      {
        type,
        version: 1,
        organizationId,
        payload,
        actor: { id: actorId, type: 'user' },
      },
      tx,
    );
  }

  private record(
    organizationId: string,
    actorId: string,
    action: string,
    entityId: string | undefined,
    details: AuditDetails,
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

function toDateOrNull(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function changedFieldNames(input: ContentItemUpdateInput): string[] {
  return Object.entries(input)
    .filter(([key, value]) => key !== 'expectedVersion' && value !== undefined)
    .map(([key]) => key);
}

function notFound(detail?: string) {
  return problem(
    HttpStatus.NOT_FOUND,
    'Not Found',
    ErrorCodes.NOT_FOUND,
    detail,
  );
}

function badRequest(detail: string) {
  return problem(
    HttpStatus.BAD_REQUEST,
    'Bad Request',
    ErrorCodes.VALIDATION_FAILED,
    detail,
  );
}

function unprocessable(detail: string) {
  return problem(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Unprocessable Entity',
    ErrorCodes.VALIDATION_FAILED,
    detail,
  );
}

function versionConflict() {
  return problem(
    HttpStatus.CONFLICT,
    'Conflict',
    ErrorCodes.CONTENT_VERSION_CONFLICT,
    'The content item was modified by someone else; reload and retry',
  );
}
