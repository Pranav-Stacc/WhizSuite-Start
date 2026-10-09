export const MEDIA_EXPORT_QUEUE = 'media-export';

export type MediaZipExportJobPayload = {
  kind: 'ZIP';
  organizationId: string;
  actorId: string;
  assetIds: string[];
  filename: string;
};

export type MediaDriveTransferJobPayload = {
  kind: 'DRIVE_TRANSFER';
  organizationId: string;
  actorId: string;
  connectionId: string;
  assetIds: string[];
  transferAll: boolean;
  driveFolderId?: string;
};

export type MediaExportJobPayload =
  | MediaZipExportJobPayload
  | MediaDriveTransferJobPayload;

export type MediaExportJobResult = {
  downloadUrl: string | null;
  error: string | null;
  transferred: number;
};
