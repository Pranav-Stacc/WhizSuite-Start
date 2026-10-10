import 'server-only';
import { getSession } from '@/shared/auth/session';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';

export async function beginMetaConnect(input: {
  clientId: string;
  platform: 'instagram' | 'facebook';
}): Promise<{ authorizeUrl: string }> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('Not signed in');
  return apiFetch<{ authorizeUrl: string }>(
    orgPath(session.orgId, 'integrations/meta/connect'),
    {
      method: 'POST',
      body: input,
    },
  );
}

export async function disconnectMetaAccount(socialAccountId: string): Promise<void> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('Not signed in');
  await apiFetch(orgPath(session.orgId, 'integrations/meta/disconnect'), {
    method: 'POST',
    body: { socialAccountId },
  });
}
