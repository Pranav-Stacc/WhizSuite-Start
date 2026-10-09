import { z } from 'zod';

/** Canonical entitlement key for plan storage caps (bytes). */
export const STORAGE_BYTES_ENTITLEMENT = 'storage.bytes' as const;

export const DataSourceKinds = ['platform', 'google_drive'] as const;
export type DataSourceKind = (typeof DataSourceKinds)[number];

export const DataSourceStatuses = ['AVAILABLE', 'CONNECTED', 'PENDING', 'ERROR', 'DISABLED'] as const;
export type DataSourceStatus = (typeof DataSourceStatuses)[number];

export const MediaExportJobKinds = ['ZIP', 'DRIVE_TRANSFER'] as const;
export type MediaExportJobKind = (typeof MediaExportJobKinds)[number];

export const MediaExportJobStatuses = ['QUEUED', 'RUNNING', 'READY', 'FAILED'] as const;
export type MediaExportJobStatus = (typeof MediaExportJobStatuses)[number];

export type MediaStorageUsageDto = {
  usedBytes: number;
  limitBytes: number | null;
  assetCount: number;
  /** 0–1 when limited; 0 when unlimited. */
  ratio: number;
};

export type MediaDataSourceDto = {
  id: string;
  kind: DataSourceKind;
  name: string;
  status: DataSourceStatus;
  /** Integration connection id when kind is an external provider. */
  connectionId: string | null;
  connectedAt: string | null;
  metadata: Record<string, unknown>;
};

export const createMediaZipExportSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(500),
  /** Optional zip base name without extension. */
  filename: z.string().trim().min(1).max(120).optional(),
});
export type CreateMediaZipExportInput = z.infer<typeof createMediaZipExportSchema>;

export const createMediaDriveTransferSchema = z.object({
  connectionId: z.string().uuid(),
  /** When true, transfer every READY asset in the org (ignores assetIds). */
  transferAll: z.boolean().default(false),
  assetIds: z.array(z.string().uuid()).max(500).default([]),
  /** Destination folder id in Drive; root when omitted. */
  driveFolderId: z.string().trim().min(1).max(256).optional(),
});
export type CreateMediaDriveTransferInput = z.infer<typeof createMediaDriveTransferSchema>;

export type MediaExportJobDto = {
  id: string;
  kind: MediaExportJobKind;
  status: MediaExportJobStatus;
  progress: number;
  downloadUrl: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};

export const GOOGLE_DRIVE_PROVIDER_KEY = 'google_drive' as const;

export const googleDriveManifestSchema = z.object({
  scopes: z.array(z.string()).default([
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
  ]),
  actions: z.array(z.enum(['import', 'export', 'list'])).default(['import', 'export', 'list']),
});
