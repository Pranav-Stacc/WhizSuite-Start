import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';
import type {
  ContentItemRecord,
  ContentSnapshot,
} from '../../application/mappers/content-item.mapper';

export type SocialTx = Prisma.TransactionClient;

const CONTENT_SELECT = {
  id: true,
  organizationId: true,
  clientId: true,
  title: true,
  caption: true,
  contentType: true,
  status: true,
  pillar: true,
  platforms: true,
  hashtags: true,
  ctaUrl: true,
  scheduledAt: true,
  gridPosition: true,
  currentVersion: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  media: {
    select: { mediaAssetId: true, position: true },
    orderBy: { position: 'asc' },
  },
} as const satisfies Prisma.ContentItemSelect;

const PUBLISH_JOB_QUEUED = 'QUEUED';
const PUBLISH_JOB_CANCELLED = 'CANCELLED';

export interface ContentListFilter {
  clientId?: string;
  /** Restricts results to these clients (client-portal principals / staff scopes). */
  allowedClientIds?: string[];
  /** Staff PROJECT scopes — content linked to these projects. */
  allowedProjectIds?: string[];
  /** Staff CONTENT scopes — specific content item ids. */
  allowedContentIds?: string[];
  status?: string;
  from?: Date;
  to?: Date;
}

export interface ContentInsertData {
  clientId: string;
  projectId?: string;
  campaignId?: string;
  title: string;
  caption?: string;
  contentType: string;
  status: string;
  pillar?: string;
  platforms: string[];
  hashtags: string[];
  ctaUrl?: string;
  scheduledAt: Date | null;
  createdById: string;
  mediaAssetIds: string[];
}

export type ContentFieldChanges = Pick<
  Prisma.ContentItemUpdateManyMutationInput,
  | 'title'
  | 'caption'
  | 'contentType'
  | 'pillar'
  | 'platforms'
  | 'hashtags'
  | 'ctaUrl'
  | 'scheduledAt'
  | 'status'
>;

@Injectable()
export class SocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(fn: (tx: SocialTx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  listContent(
    organizationId: string,
    filter: ContentListFilter,
    limit: number,
  ): Promise<ContentItemRecord[]> {
    const scheduledAt =
      filter.from || filter.to
        ? {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lt: filter.to } : {}),
          }
        : undefined;
    const scopeOr =
      filter.allowedContentIds && filter.allowedProjectIds
        ? {
            OR: [
              { id: { in: filter.allowedContentIds } },
              { projectId: { in: filter.allowedProjectIds } },
            ],
          }
        : filter.allowedContentIds
          ? { id: { in: filter.allowedContentIds } }
          : filter.allowedProjectIds
            ? { projectId: { in: filter.allowedProjectIds } }
            : undefined;

    return this.prisma.contentItem.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filter.clientId ? { clientId: filter.clientId } : {}),
        ...(filter.allowedClientIds
          ? { AND: [{ clientId: { in: filter.allowedClientIds } }] }
          : {}),
        ...(scopeOr ? { AND: [scopeOr] } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(scheduledAt ? { scheduledAt } : {}),
      },
      orderBy: [
        { gridPosition: { sort: 'asc', nulls: 'last' } },
        { scheduledAt: { sort: 'desc', nulls: 'first' } },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: CONTENT_SELECT,
    });
  }

  findContent(
    organizationId: string,
    id: string,
    client: SocialTx = this.prisma,
  ): Promise<ContentItemRecord | null> {
    return client.contentItem.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: CONTENT_SELECT,
    });
  }

  insertContent(
    tx: SocialTx,
    organizationId: string,
    data: ContentInsertData,
  ): Promise<ContentItemRecord> {
    return tx.contentItem.create({
      data: {
        organizationId,
        clientId: data.clientId,
        projectId: data.projectId,
        campaignId: data.campaignId,
        title: data.title,
        caption: data.caption,
        contentType: data.contentType,
        status: data.status,
        pillar: data.pillar,
        platforms: data.platforms,
        hashtags: data.hashtags,
        ctaUrl: data.ctaUrl,
        scheduledAt: data.scheduledAt,
        createdById: data.createdById,
        media: { create: toMediaRows(organizationId, data.mediaAssetIds) },
      },
      select: CONTENT_SELECT,
    });
  }

  /** Applies changes only if the row is still at `expectedVersion`; returns the number of rows updated (0 or 1). */
  async updateContentIfVersion(
    tx: SocialTx,
    organizationId: string,
    id: string,
    expectedVersion: number,
    changes: ContentFieldChanges,
    options: { newSnapshot: boolean },
  ): Promise<number> {
    const result = await tx.contentItem.updateMany({
      where: { id, organizationId, deletedAt: null, version: expectedVersion },
      data: {
        ...changes,
        version: { increment: 1 },
        ...(options.newSnapshot ? { currentVersion: { increment: 1 } } : {}),
      },
    });
    return result.count;
  }

  async replaceMedia(
    tx: SocialTx,
    organizationId: string,
    contentItemId: string,
    mediaAssetIds: string[],
  ): Promise<void> {
    await tx.contentMedia.deleteMany({
      where: { organizationId, contentItemId },
    });
    if (mediaAssetIds.length === 0) return;
    await tx.contentMedia.createMany({
      data: toMediaRows(organizationId, mediaAssetIds).map((row) => ({
        ...row,
        contentItemId,
      })),
    });
  }

  async insertVersionSnapshot(
    tx: SocialTx,
    organizationId: string,
    contentItemId: string,
    version: number,
    snapshot: ContentSnapshot,
    createdById: string,
  ): Promise<void> {
    await tx.contentVersion.create({
      data: { organizationId, contentItemId, version, snapshot, createdById },
    });
  }

  async softDeleteContent(
    tx: SocialTx,
    organizationId: string,
    id: string,
  ): Promise<number> {
    const result = await tx.contentItem.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    return result.count;
  }

  async cancelQueuedPublishJobs(
    tx: SocialTx,
    organizationId: string,
    contentItemId: string,
  ): Promise<void> {
    await tx.publishJob.updateMany({
      where: {
        organizationId,
        status: PUBLISH_JOB_QUEUED,
        variant: { contentItemId },
      },
      data: { status: PUBLISH_JOB_CANCELLED },
    });
  }

  /** Sets grid_position = index for every id in one statement; returns how many live rows of the client matched. */
  applyGridOrder(
    tx: SocialTx,
    organizationId: string,
    clientId: string,
    orderedIds: string[],
  ): Promise<number> {
    const positions = orderedIds.map((_, index) => index);
    return tx.$executeRaw`
      UPDATE "social"."content_items" AS c
      SET "grid_position" = v.position, "updated_at" = now()
      FROM unnest(${orderedIds}::uuid[], ${positions}::int[]) AS v(id, position)
      WHERE c."id" = v.id
        AND c."organization_id" = ${organizationId}::uuid
        AND c."client_id" = ${clientId}::uuid
        AND c."deleted_at" IS NULL`;
  }

  scheduleVariant(
    organizationId: string,
    variantId: string,
    scheduledAt: Date,
  ) {
    return this.prisma.contentVariant.update({
      where: { id: variantId, organizationId },
      data: {
        scheduledAt,
        publishStatus: 'SCHEDULED',
      },
    });
  }

  createPublishJob(
    organizationId: string,
    variantId: string,
    scheduledFor: Date,
  ) {
    return this.prisma.publishJob.create({
      data: {
        organizationId,
        variantId,
        scheduledFor,
        status: PUBLISH_JOB_QUEUED,
        idempotencyKey: `publish:${variantId}:${scheduledFor.toISOString()}`,
      },
    });
  }

  async recordStateHistory(
    tx: SocialTx,
    data: {
      organizationId: string;
      entityType: string;
      entityId: string;
      fromState: string;
      toState: string;
      actorId: string;
    },
  ): Promise<void> {
    await tx.entityStateHistory.create({ data });
  }

  listCampaigns(
    organizationId: string,
    clientId?: string,
    allowedClientIds?: string[],
  ) {
    return this.prisma.campaign.findMany({
      where: {
        organizationId,
        ...(clientId ? { clientId } : {}),
        ...(allowedClientIds ? { clientId: { in: allowedClientIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAccounts(organizationId: string, clientId?: string) {
    return this.prisma.socialAccount.findMany({
      where: { organizationId, ...(clientId ? { clientId } : {}) },
      include: { channels: true },
    });
  }

  async upsertConnectedAccount(input: {
    organizationId: string;
    clientId: string;
    platform: string;
    externalAccountId: string;
    displayName: string;
    connectionId: string;
    channelExternalId: string;
    channelName: string;
  }) {
    const existing = await this.prisma.socialAccount.findFirst({
      where: {
        organizationId: input.organizationId,
        clientId: input.clientId,
        platform: input.platform,
        externalAccountId: input.externalAccountId,
      },
      include: { channels: true },
    });

    if (existing) {
      await this.prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          displayName: input.displayName,
          status: 'CONNECTED',
          connectionId: input.connectionId,
          publishingPaused: false,
        },
      });
      if (existing.channels.length === 0) {
        await this.prisma.socialChannel.create({
          data: {
            organizationId: input.organizationId,
            accountId: existing.id,
            channelType: 'FEED',
            externalId: input.channelExternalId,
            name: input.channelName,
          },
        });
      }
      return existing.id;
    }

    const created = await this.prisma.socialAccount.create({
      data: {
        organizationId: input.organizationId,
        clientId: input.clientId,
        platform: input.platform,
        externalAccountId: input.externalAccountId,
        displayName: input.displayName,
        status: 'CONNECTED',
        connectionId: input.connectionId,
        channels: {
          create: {
            organizationId: input.organizationId,
            channelType: 'FEED',
            externalId: input.channelExternalId,
            name: input.channelName,
          },
        },
      },
    });
    return created.id;
  }
}

function toMediaRows(organizationId: string, mediaAssetIds: string[]) {
  return mediaAssetIds.map((mediaAssetId, position) => ({
    organizationId,
    mediaAssetId,
    position,
  }));
}
