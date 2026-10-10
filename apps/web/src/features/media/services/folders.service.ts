import 'server-only';
import {
  DefaultClientFolderTemplate,
  DefaultContentPlatformFolders,
  type CreateMediaFolderInput,
  type MediaFolderDto,
} from '@agency-os/contracts';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { getSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';

const TAG = 'media-folders';

async function orgId(): Promise<string> {
  return (await getSession())?.orgId ?? '';
}

/** Demo/offline seed — mirrors the live ensure-client tree so the folder UI is usable without API. */
function demoFolders(clientId: string): MediaFolderDto[] {
  const now = new Date().toISOString();
  const org = 'demo-org';
  const roots = DefaultClientFolderTemplate.map((template, index) => {
    const id = `demo-folder-${clientId}-${index}`;
    return {
      id,
      organizationId: org,
      clientId,
      projectId: null,
      calendarItemId: null,
      parentId: null,
      name: template.name,
      path: `/clients/${clientId}/${template.name}`,
      visibility: template.visibility,
      description: null,
      createdAt: now,
    } satisfies MediaFolderDto;
  });
  const content = roots.find((folder) => folder.name === 'Content');
  if (!content) return roots;
  const shelves = DefaultContentPlatformFolders.map((name, index) => ({
    id: `demo-folder-${clientId}-content-${index}`,
    organizationId: org,
    clientId,
    projectId: null,
    calendarItemId: null,
    parentId: content.id,
    name,
    path: `${content.path}/${name}`,
    visibility: 'CLIENT_VISIBLE' as const,
    description: null,
    createdAt: now,
  }));
  return [...roots, ...shelves];
}

export async function listFolders(clientId: string): Promise<MediaFolderDto[]> {
  if (!isLiveMode) return demoFolders(clientId);
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
  if (!isLiveMode) return demoFolders(clientId);
  const organizationId = await orgId();
  return apiFetch<MediaFolderDto[]>(orgPath(organizationId, 'media/folders/ensure-client'), {
    method: 'POST',
    body: { clientId },
  });
}

export async function createFolder(input: CreateMediaFolderInput): Promise<MediaFolderDto> {
  if (!isLiveMode) {
    const clientId = input.clientId ?? 'demo';
    return {
      id: `demo-folder-${Date.now()}`,
      organizationId: 'demo-org',
      clientId,
      projectId: input.projectId ?? null,
      calendarItemId: input.calendarItemId ?? null,
      parentId: input.parentId ?? null,
      name: input.name,
      path: `/clients/${clientId}/${input.name}`,
      visibility: input.visibility,
      description: input.description ?? null,
      createdAt: new Date().toISOString(),
    };
  }
  const organizationId = await orgId();
  return apiFetch<MediaFolderDto>(orgPath(organizationId, 'media/folders'), {
    method: 'POST',
    body: input,
  });
}

export async function deleteFolder(folderId: string): Promise<void> {
  if (!isLiveMode) return;
  const organizationId = await orgId();
  await apiFetch<void>(`${orgPath(organizationId, 'media/folders')}/${folderId}`, {
    method: 'DELETE',
  });
}
