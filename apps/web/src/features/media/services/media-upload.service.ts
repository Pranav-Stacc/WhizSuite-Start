import 'server-only';
import type {
  MediaAssetDto,
  MediaDownloadDisposition,
  MediaDownloadUrlDto,
  PresignMediaUploadInput,
  PresignedMediaUploadDto,
} from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { mediaLive } from '@/shared/api/live/bindings';
import { requireSession } from '@/shared/auth/session';

async function assetsPath(): Promise<string> {
  const session = await requireSession();
  return mediaLive.path(session.orgId);
}

export async function presignUpload(input: PresignMediaUploadInput): Promise<PresignedMediaUploadDto> {
  return apiFetch<PresignedMediaUploadDto>(`${await assetsPath()}/presign`, { method: 'POST', body: input });
}

export async function completeUpload(assetId: string): Promise<MediaAssetDto> {
  return apiFetch<MediaAssetDto>(`${await assetsPath()}/${assetId}/complete`, { method: 'POST' });
}

export async function createDownloadUrl(
  assetId: string,
  disposition: MediaDownloadDisposition,
): Promise<MediaDownloadUrlDto> {
  return apiFetch<MediaDownloadUrlDto>(`${await assetsPath()}/${assetId}/download-url`, { query: { disposition } });
}
