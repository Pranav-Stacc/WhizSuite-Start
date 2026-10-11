import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { unwrapList } from '@/shared/api/live/utils';
import { isLiveMode } from '@/shared/config/env';

export interface PermissionRow {
  key: string;
  category: string;
  description: string;
}

function staticPermissionCatalog(): PermissionRow[] {
  return Object.values(Permissions).map((key) => ({
    key,
    category: key.split('.')[0] ?? 'general',
    description: key,
  }));
}

export async function listPermissionCatalog(): Promise<PermissionRow[]> {
  if (!isLiveMode) return staticPermissionCatalog();
  try {
    const data = await apiFetch<unknown>('v1/permissions');
    return unwrapList(data).map((row) => ({
      key: String((row as { key?: string }).key ?? ''),
      category: String((row as { category?: string }).category ?? 'general'),
      description: String((row as { description?: string }).description ?? ''),
    }));
  } catch (error) {
    if (error instanceof ApiError && error.code === 'UPSTREAM_UNAVAILABLE') return staticPermissionCatalog();
    throw error;
  }
}
