import type { ContentItem, ContentMedia } from '@prisma/client';
import type {
  ContentItemDto,
  ContentMediaDto,
  EmbeddedMediaDto,
} from '@agency-os/contracts';

export type ContentItemRecord = Pick<
  ContentItem,
  | 'id'
  | 'organizationId'
  | 'clientId'
  | 'title'
  | 'caption'
  | 'contentType'
  | 'status'
  | 'pillar'
  | 'platforms'
  | 'hashtags'
  | 'ctaUrl'
  | 'scheduledAt'
  | 'gridPosition'
  | 'currentVersion'
  | 'createdById'
  | 'createdAt'
  | 'updatedAt'
  | 'version'
> & { media: Pick<ContentMedia, 'mediaAssetId' | 'position'>[] };

/** Audit-safe and version-snapshot representation: no signed URLs. */
export type ContentSnapshot = {
  clientId: string;
  title: string;
  caption: string | null;
  contentType: string;
  status: string;
  pillar: string | null;
  platforms: string[];
  hashtags: string[];
  ctaUrl: string | null;
  scheduledAt: string | null;
  mediaAssetIds: string[];
};

export function collectMediaAssetIds(
  records: readonly ContentItemRecord[],
): string[] {
  return records.flatMap((record) => record.media.map((m) => m.mediaAssetId));
}

export function toContentItemDto(
  record: ContentItemRecord,
  embedded: ReadonlyMap<string, EmbeddedMediaDto>,
): ContentItemDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    clientId: record.clientId,
    title: record.title,
    caption: record.caption,
    contentType: record.contentType,
    status: record.status,
    pillar: record.pillar,
    platforms: record.platforms,
    hashtags: record.hashtags,
    ctaUrl: record.ctaUrl,
    scheduledAt: record.scheduledAt?.toISOString() ?? null,
    gridPosition: record.gridPosition,
    createdById: record.createdById,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    version: record.version,
    media: toContentMediaDtos(record.media, embedded),
  };
}

export function toContentSnapshot(record: ContentItemRecord): ContentSnapshot {
  return {
    clientId: record.clientId,
    title: record.title,
    caption: record.caption,
    contentType: record.contentType,
    status: record.status,
    pillar: record.pillar,
    platforms: record.platforms,
    hashtags: record.hashtags,
    ctaUrl: record.ctaUrl,
    scheduledAt: record.scheduledAt?.toISOString() ?? null,
    mediaAssetIds: sortByPosition(record.media).map((m) => m.mediaAssetId),
  };
}

function toContentMediaDtos(
  media: ContentItemRecord['media'],
  embedded: ReadonlyMap<string, EmbeddedMediaDto>,
): ContentMediaDto[] {
  const result: ContentMediaDto[] = [];
  for (const item of sortByPosition(media)) {
    const asset = embedded.get(item.mediaAssetId);
    if (!asset) continue;
    result.push({
      assetId: item.mediaAssetId,
      position: item.position,
      name: asset.name,
      mimeType: asset.mimeType,
      url: asset.url,
    });
  }
  return result;
}

function sortByPosition<T extends { position: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}
