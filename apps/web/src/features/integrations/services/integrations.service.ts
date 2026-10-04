import 'server-only';
import type { Platform } from '@agency-os/contracts';
import { integrationsRepository, type Integration } from '../data/integrations.repository';

export type { Integration };

export async function listIntegrations(): Promise<Integration[]> {
  return integrationsRepository.list();
}

/** Platforms currently connected for a client, in stable order. */
export async function connectedPlatforms(clientId: string): Promise<Platform[]> {
  const rows = await integrationsRepository.list();
  return rows.filter((row) => row.clientId === clientId && row.connected).map((row) => row.platform);
}
