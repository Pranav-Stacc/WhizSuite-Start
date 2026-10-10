import { z } from 'zod';
import { Visibilities } from '../platform/resources.js';

export const MediaAssetStatuses = ['PENDING_UPLOAD', 'READY', 'FAILED'] as const;
export type MediaAssetStatus = (typeof MediaAssetStatuses)[number];

export const MediaDownloadDispositions = ['inline', 'attachment'] as const;
export type MediaDownloadDisposition = (typeof MediaDownloadDispositions)[number];

export const MediaUsageSubjectTypes = ['CONTENT', 'APPROVAL', 'FEEDBACK', 'MESSAGE', 'OTHER'] as const;
export type MediaUsageSubjectType = (typeof MediaUsageSubjectTypes)[number];

export const MEDIA_FILENAME_MAX_LENGTH = 255;
export const MIME_TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

export const createMediaFolderSchema = z.object({
  name: z.string().trim().min(1).max(MEDIA_FILENAME_MAX_LENGTH),
  parentId: z.string().uuid().optional(),
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  calendarItemId: z.string().uuid().nullable().optional(),
  visibility: z.enum(Visibilities).default('INTERNAL'),
  description: z.string().trim().max(2000).optional(),
});
export type CreateMediaFolderInput = z.infer<typeof createMediaFolderSchema>;

export const updateMediaFolderSchema = z.object({
  name: z.string().trim().min(1).max(MEDIA_FILENAME_MAX_LENGTH).optional(),
  visibility: z.enum(Visibilities).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});
export type UpdateMediaFolderInput = z.infer<typeof updateMediaFolderSchema>;

export const createShootSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional(),
  allDay: z.boolean().default(true),
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  /** Create Raw / Selects / Finals / Deliverables under Shoots/{title}. */
  createFolders: z.boolean().default(true),
  /** Optional checklist tasks created on the project (requires projectId). */
  taskTitles: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  /** Opt-in push to the org's connected Google Calendar. */
  syncToGoogle: z.boolean().default(false),
});
export type CreateShootInput = z.infer<typeof createShootSchema>;

export const tagMediaAssetSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(64)).max(30),
});
export type TagMediaAssetInput = z.infer<typeof tagMediaAssetSchema>;

export const recordMediaUsageSchema = z.object({
  assetId: z.string().uuid(),
  subjectType: z.enum(MediaUsageSubjectTypes),
  subjectId: z.string().uuid(),
});
export type RecordMediaUsageInput = z.infer<typeof recordMediaUsageSchema>;

export const listMediaAssetsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  clientId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  calendarItemId: z.string().uuid().optional(),
  tag: z.string().trim().max(64).optional(),
  /** When true, only folders/assets with CLIENT_VISIBLE visibility. */
  clientVisibleOnly: z.coerce.boolean().optional(),
});
export type ListMediaAssetsQuery = z.infer<typeof listMediaAssetsQuerySchema>;

export const presignMediaUploadSchema = z.object({
  filename: z.string().trim().min(1).max(MEDIA_FILENAME_MAX_LENGTH),
  mimeType: z.string().trim().toLowerCase().regex(MIME_TYPE_PATTERN),
  sizeBytes: z.number().int().positive(),
  clientId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  calendarItemId: z.string().uuid().optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(30).optional(),
});
export type PresignMediaUploadInput = z.infer<typeof presignMediaUploadSchema>;

export const updateMediaAssetSchema = z.object({
  name: z.string().trim().min(1).max(MEDIA_FILENAME_MAX_LENGTH).optional(),
  clientId: z.string().uuid().nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  calendarItemId: z.string().uuid().nullable().optional(),
});
export type UpdateMediaAssetInput = z.infer<typeof updateMediaAssetSchema>;

export type MediaFolderDto = {
  id: string;
  organizationId: string;
  clientId: string | null;
  projectId: string | null;
  calendarItemId: string | null;
  parentId: string | null;
  name: string;
  path: string;
  visibility: 'INTERNAL' | 'CLIENT_VISIBLE';
  description: string | null;
  createdAt: string;
};

export type MediaAssetDto = {
  id: string;
  organizationId: string;
  clientId: string | null;
  folderId: string | null;
  projectId: string | null;
  calendarItemId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: MediaAssetStatus;
  currentVersion: number;
  tags: string[];
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  /** Inline signed GET for ready images/videos in list responses; null otherwise. */
  previewUrl?: string | null;
};

export interface PresignedMediaUploadDto {
  asset: MediaAssetDto;
  uploadUrl: string;
  method: 'PUT';
  /** Headers the client must send with the upload request, exactly as given. */
  headers: Record<string, string>;
  expiresInSeconds: number;
}

export interface MediaDownloadUrlDto {
  url: string;
  expiresInSeconds: number;
}

/** Asset summary for embedding in other domains' responses; `url` is an inline signed GET, set only when READY. */
export type EmbeddedMediaDto = {
  assetId: string;
  name: string;
  mimeType: string;
  status: MediaAssetStatus;
  url: string | null;
};
