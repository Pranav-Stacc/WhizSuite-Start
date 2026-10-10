import 'server-only';
import { revalidatePath, updateTag } from 'next/cache';
import { getSession } from '@/shared/auth/session';

/**
 * Invalidates org-scoped data cache tags after a mutation. Tagged `apiFetch` reads
 * refresh in the background on the next request without remounting the app shell.
 */
export async function refreshData(...tags: string[]): Promise<void> {
  const session = await getSession();
  if (!session || tags.length === 0) return;
  for (const tag of tags) updateTag(`org:${session.orgId}:${tag}`);
}

/**
 * Narrow path invalidation when a specific route segment must re-render.
 * Prefer `refreshData` with cache tags; never invalidate the root layout.
 */
export async function refreshPage(path: string): Promise<void> {
  revalidatePath(path, 'page');
}
