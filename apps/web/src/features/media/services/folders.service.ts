import 'server-only';
import type { CreateMediaFolderInput, MediaFolderDto } from '@agency-os/contracts';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { getSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';

const TAG = 'media-folders';

async function orgId(): Promise<string> {
  return (await getSession())?.orgId ?? '';
}

export async function listFolders(clientId: string): Promise<MediaFolderDto[]> {
  if (!isLiveMode) return [];
  const organizationId = await orgId();
  if (!organizationId) return [];
  try {
    return await apiFetch<MediaFolderDto[]>(
      `${orgPath(organizationId, 'media/folders')}?clientId=${encodeURIComponent(clientId)}`,
      { tags: [TAG, `client:${clientId}`] },
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return [];
    throw error;
  }
}

export async function ensureClientFolders(clientId: string): Promise<MediaFolderDto[]> {
  const organizationId = await orgId();
  return apiFetch<MediaFolderDto[]>(orgPath(organizationId, 'media/folders/ensure-client'), {
    method: 'POST',
    body: { clientId },
  });
}

export async function createFolder(input: CreateMediaFolderInput): Promise<MediaFolderDto> {
  const organizationId = await orgId();
  return apiFetch<MediaFolderDto>(orgPath(organizationId, 'media/folders'), {
    method: 'POST',
    body: input,
  });
}

export async function deleteFolder(folderId: string): Promise<void> {
  const organizationId = await orgId();
  await apiFetch<void>(`${orgPath(organizationId, 'media/folders')}/${folderId}`, {
    method: 'DELETE',
  });
}
