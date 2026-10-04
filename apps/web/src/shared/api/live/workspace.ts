import 'server-only';
import { cache } from 'react';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { orgPath, unwrapList } from './utils';

/** First workspace for the active org — required when creating clients/projects in live mode. */
export const defaultWorkspaceId = cache(async (): Promise<string> => {
  const session = await getSession();
  if (!session?.orgId) return '';
  const rows = unwrapList(await apiFetch(orgPath(session.orgId, 'workspaces'), { tags: [`org:${session.orgId}:workspaces`] }));
  const id = rows[0]?.id;
  return typeof id === 'string' ? id : '';
});
