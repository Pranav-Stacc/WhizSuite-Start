import { z } from 'zod';

export const MediaAssetStatuses = ['PENDING_UPLOAD', 'READY', 'FAILED'] as const;
export type MediaAssetStatus = (typeof MediaAssetStatuses)[number];

export const MediaDownloadDispositions = ['inline', 'attachment'] as const;
export type MediaDownloadDisposition = (typeof MediaDownloadDispositions)[number];

export const MEDIA_FILENAME_MAX_LENGTH = 255;
export const MIME_TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

export const presignMediaUploadSchema = z.object({
  filename: z.string().trim().min(1).max(MEDIA_FILENAME_MAX_LENGTH),
  mimeType: z.string().trim().toLowerCase().regex(MIME_TYPE_PATTERN),
  sizeBytes: z.number().int().positive(),
  clientId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
});
export type PresignMediaUploadInput = z.infer<typeof presignMediaUploadSchema>;

export const updateMediaAssetSchema = z.object({
  name: z.string().trim().min(1).max(MEDIA_FILENAME_MAX_LENGTH).optional(),
  clientId: z.string().uuid().nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
});
export type UpdateMediaAssetInput = z.infer<typeof updateMediaAssetSchema>;

export type MediaAssetDto = {
  id: string;
  organizationId: string;
  clientId: string | null;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: MediaAssetStatus;
  currentVersion: number;
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
