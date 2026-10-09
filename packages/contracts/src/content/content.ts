import { z } from 'zod';
import { ContentStatuses, Platforms } from '../domain/statuses.js';

export const ApiContentTypes = ['STATIC_POST', 'REEL', 'STORY', 'CAROUSEL', 'VIDEO', 'ARTICLE'] as const;
export type ApiContentType = (typeof ApiContentTypes)[number];

/** Statuses a content item may be created in; later states are reached via transitions. */
export const ContentCreatableStatuses = ['DRAFT', 'IN_REVIEW'] as const satisfies readonly (typeof ContentStatuses)[number][];
export type ContentCreatableStatus = (typeof ContentCreatableStatuses)[number];

export const CONTENT_TITLE_MAX_LENGTH = 200;
export const CONTENT_CAPTION_MAX_LENGTH = 5000;
export const CONTENT_PILLAR_MAX_LENGTH = 100;
export const CONTENT_HASHTAG_MAX_LENGTH = 100;
export const CONTENT_CTA_URL_MAX_LENGTH = 2048;
export const HASHTAG_PATTERN = /^#?[^\s#]+$/u;

/** Defaults for the server-configurable limits (CONTENT_MEDIA_MAX, CONTENT_HASHTAGS_MAX, CONTENT_REORDER_MAX). */
export const CONTENT_MEDIA_MAX_DEFAULT = 20;
export const CONTENT_HASHTAGS_MAX_DEFAULT = 30;
export const CONTENT_REORDER_MAX_DEFAULT = 200;
export const CONTENT_LIST_LIMIT_DEFAULT = 500;

const HASHTAG_PREFIX = '#';

/** Prefixes every tag with '#', drops empties and removes case-insensitive duplicates (first wins). */
export function normalizeHashtags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const tag = trimmed.startsWith(HASHTAG_PREFIX) ? trimmed : `${HASHTAG_PREFIX}${trimmed}`;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

const uniqueUuids = (max: number) =>
  z
    .array(z.string().uuid())
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, 'validation.unique');

const hashtagsSchema = z
  .array(z.string().trim().min(1).max(CONTENT_HASHTAG_MAX_LENGTH).regex(HASHTAG_PATTERN))
  .max(CONTENT_HASHTAGS_MAX_DEFAULT)
  .transform(normalizeHashtags);

const scheduledAtSchema = z.string().datetime({ offset: true }).nullable();

export const contentItemCreateSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(CONTENT_TITLE_MAX_LENGTH),
  caption: z.string().max(CONTENT_CAPTION_MAX_LENGTH).optional(),
  contentType: z.enum(ApiContentTypes),
  pillar: z.string().trim().max(CONTENT_PILLAR_MAX_LENGTH).optional(),
  platforms: z.array(z.enum(Platforms)).optional(),
  hashtags: hashtagsSchema.optional(),
  ctaUrl: z.string().url().max(CONTENT_CTA_URL_MAX_LENGTH).optional(),
  scheduledAt: scheduledAtSchema.optional(),
  status: z.enum(ContentCreatableStatuses).optional(),
  mediaAssetIds: uniqueUuids(CONTENT_MEDIA_MAX_DEFAULT).optional(),
});
export type ContentItemCreateInput = z.input<typeof contentItemCreateSchema>;

export const contentItemUpdateSchema = z.object({
  title: z.string().trim().min(1).max(CONTENT_TITLE_MAX_LENGTH).optional(),
  caption: z.string().max(CONTENT_CAPTION_MAX_LENGTH).nullable().optional(),
  contentType: z.enum(ApiContentTypes).optional(),
  pillar: z.string().trim().max(CONTENT_PILLAR_MAX_LENGTH).nullable().optional(),
  platforms: z.array(z.enum(Platforms)).optional(),
  hashtags: hashtagsSchema.optional(),
  ctaUrl: z.string().url().max(CONTENT_CTA_URL_MAX_LENGTH).nullable().optional(),
  scheduledAt: scheduledAtSchema.optional(),
  mediaAssetIds: uniqueUuids(CONTENT_MEDIA_MAX_DEFAULT).optional(),
  expectedVersion: z.number().int().positive().optional(),
});
export type ContentItemUpdateInput = z.input<typeof contentItemUpdateSchema>;

export const contentReorderSchema = z.object({
  clientId: z.string().uuid(),
  orderedIds: uniqueUuids(CONTENT_REORDER_MAX_DEFAULT),
});
export type ContentReorderInput = z.infer<typeof contentReorderSchema>;

export const contentTransitionSchema = z.object({
  toStatus: z.enum(ContentStatuses),
});
export type ContentTransitionInput = z.infer<typeof contentTransitionSchema>;

export const contentListQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  status: z.enum(ContentStatuses).optional(),
});
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;

export type ContentMediaDto = {
  assetId: string;
  position: number;
  name: string;
  mimeType: string;
  url: string | null;
};

export type ContentItemDto = {
  id: string;
  organizationId: string;
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
  gridPosition: number | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  media: ContentMediaDto[];
};
