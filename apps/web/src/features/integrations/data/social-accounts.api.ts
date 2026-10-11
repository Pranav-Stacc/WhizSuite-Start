import 'server-only';
import { Platforms, type Platform } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { orgPath } from '@/shared/api/live/utils';

const TAG = 'integrations';
const CONNECTED_STATUS = 'CONNECTED';

export interface SocialAccount {
  id: string;
  clientId: string;
  platform: Platform;
  handle: string;
  connected: boolean;
  channelIds: string[];
}

interface ApiSocialAccount {
  id: string;
  clientId: string;
  platform: string;
  displayName: string;
  status: string;
  channels?: Array<{ id: string }>;
}

function platformOf(value: string): Platform | undefined {
  const normalized = value.toLowerCase();
  return Platforms.find((p) => p === normalized);
}

/** Social accounts linked to clients; accounts on platforms the app does not support are skipped. */
export async function fetchSocialAccounts(): Promise<SocialAccount[]> {
  const org = (await getSession())?.orgId ?? '';
  if (!org) return [];
  const rows = await apiFetch<ApiSocialAccount[]>(orgPath(org, 'social-accounts'), { tags: [`org:${org}:${TAG}`] });
  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const platform = platformOf(row.platform);
    if (!platform) return [];
    return [{
      id: row.id,
      clientId: row.clientId,
      platform,
      handle: row.displayName,
      connected: row.status === CONNECTED_STATUS,
      channelIds: (row.channels ?? []).map((c) => c.id),
    }];
  });
}
