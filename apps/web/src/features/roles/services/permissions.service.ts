import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { unwrapList } from '@/shared/api/live/utils';
import { isLiveMode } from '@/shared/config/env';

export interface PermissionRow {
  key: string;
  category: string;
  description: string;
}

export async function listPermissionCatalog(): Promise<PermissionRow[]> {
  if (isLiveMode) {
    const data = await apiFetch<unknown>('v1/permissions');
    return unwrapList(data).map((row) => ({
      key: String((row as { key?: string }).key ?? ''),
      category: String((row as { category?: string }).category ?? 'general'),
      description: String((row as { description?: string }).description ?? ''),
    }));
  }
  return Object.values(Permissions).map((key) => ({
    key,
    category: key.split('.')[0] ?? 'general',
    description: key,
  }));
}
