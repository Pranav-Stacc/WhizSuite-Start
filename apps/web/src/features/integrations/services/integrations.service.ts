import 'server-only';
import { Platforms, type Platform } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import { METRIC_KEYS, fetchMetricSnapshots } from '@/features/analytics/data/metrics.api';
import { latestByChannel } from '@/features/analytics/utils/aggregate';
import { listClients } from '@/features/clients/services/clients.service';
import { integrationsRepository, type Integration } from '../data/integrations.repository';
import { fetchSocialAccounts } from '../data/social-accounts.api';

export type { Integration };

/** One row per client and platform: linked social accounts are connected, the rest are available to connect. */
async function liveIntegrations(): Promise<Integration[]> {
  const [clients, accounts, snapshots] = await Promise.all([
    listClients(),
    fetchSocialAccounts(),
    fetchMetricSnapshots({ metrics: [METRIC_KEYS.followers] }),
  ]);
  const followers = latestByChannel(snapshots, METRIC_KEYS.followers);
  const accountFor = new Map(accounts.map((a) => [`${a.clientId}:${a.platform}`, a]));

  return clients.flatMap((client) =>
    Platforms.map((platform): Integration => {
      const account = accountFor.get(`${client.id}:${platform}`);
      if (!account) return { id: `${client.id}:${platform}`, clientId: client.id, platform, handle: '', connected: false, followers: 0 };
      const latest = account.channelIds.map((id) => followers.get(id)).filter((v) => v !== undefined);
      return {
        id: account.id,
        clientId: client.id,
        platform,
        handle: account.handle,
        connected: account.connected,
        followers: latest.reduce((sum, v) => sum + v.value, 0),
        lastSyncAt: latest.map((v) => v.recordedAt).sort().at(-1),
      };
    }),
  );
}

export async function listIntegrations(): Promise<Integration[]> {
  return isLiveMode ? liveIntegrations() : integrationsRepository.list();
}

/** Platforms currently connected for a client, in stable order. */
export async function connectedPlatforms(clientId: string): Promise<Platform[]> {
  const rows = await listIntegrations();
  return rows.filter((row) => row.clientId === clientId && row.connected).map((row) => row.platform);
}
