import 'server-only';
import { revalidatePath, updateTag } from 'next/cache';
import { getSession } from '@/shared/auth/session';

/**
 * Call after every mutation: invalidates the org-scoped data tag (live API cache)
 * and the router cache so every open view revalidates on next navigation.
 */
export async function refreshData(...tags: string[]): Promise<void> {
  const session = await getSession();
  if (session) {
    for (const tag of tags) updateTag(`org:${session.orgId}:${tag}`);
  }
  revalidatePath('/', 'layout');
}
