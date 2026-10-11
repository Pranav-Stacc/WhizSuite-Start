import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { ApiError } from '@/shared/api/api-client';
import { getPermissions } from '@/shared/auth/permissions';
import { DEFAULT_CLIENT_COLOR } from '@/features/clients/config';
import type { Client } from '@/features/clients/data/clients.repository';
import { listClients } from '@/features/clients/services/clients.service';

const EMPTY_BRAND = {
  primary: DEFAULT_CLIENT_COLOR,
  secondary: '#0B1513',
  accent: '#F5F7F6',
  voice: '',
  hashtags: [] as string[],
  pillars: [] as string[],
};

/** Minimal client row when the clients API is unavailable but content references a brand id. */
export function stubClientFromPost(clientId: string, name?: string): Client {
  return {
    id: clientId,
    name: name ?? 'Client',
    industry: '',
    website: '',
    tier: '',
    status: 'ACTIVE',
    color: DEFAULT_CLIENT_COLOR,
    contactName: '',
    contactEmail: '',
    health: 100,
    retainerMinor: 0,
    platforms: [],
    since: new Date(0).toISOString(),
    ownerId: '',
    brand: EMPTY_BRAND,
  };
}

/** Client brands for content filters and composer — scoped list even without full clients module access. */
export async function listClientsForContent(
  posts: ReadonlyArray<{ clientId: string }> = [],
): Promise<Client[]> {
  const granted = await getPermissions();
  if (!granted.has(Permissions.CLIENTS_VIEW) && !granted.has(Permissions.CONTENT_VIEW)) {
    return [];
  }
  try {
    const clients = await listClients();
    if (clients.length > 0) return clients;
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 403 && error.status !== 404)) {
      throw error;
    }
  }
  const byId = new Map<string, Client>();
  for (const post of posts) {
    if (!byId.has(post.clientId)) byId.set(post.clientId, stubClientFromPost(post.clientId));
  }
  return [...byId.values()];
}
