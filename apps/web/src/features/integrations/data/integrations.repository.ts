import 'server-only';
import { Platforms, type Platform } from '@agency-os/contracts';
import { createRepository, type Entity } from '@/shared/data/repository';
import { seeded } from '@/shared/lib/seeded';

export interface Integration extends Entity {
  clientId: string;
  platform: Platform;
  handle: string;
  connected: boolean;
  followers: number;
  lastSyncAt?: string;
}

const SEED_SYNC_AGE_MS = 2 * 60 * 60 * 1000;

const slug = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '');

export const integrationsRepository = createRepository<Integration>('integrations', () => {
  // Seed is synchronous by contract; clients are static demo data so we mirror their ids and platforms here.
  const clients = [
    ['cl-lumen', 'Lumen Coffee Co.', ['instagram', 'facebook', 'tiktok']],
    ['cl-orbit', 'Orbit Fitness', ['instagram', 'youtube', 'tiktok']],
    ['cl-verde', 'Verde Skincare', ['instagram', 'facebook', 'youtube']],
    ['cl-nimbus', 'Nimbus Cloud', ['linkedin', 'x', 'youtube']],
    ['cl-urban', 'Urban Threads', ['instagram', 'tiktok']],
    ['cl-atlas', 'Atlas Realty', ['facebook', 'linkedin', 'youtube']],
  ] as const;
  return clients.flatMap(([clientId, name, connectedPlatforms]) =>
    Platforms.map((platform) => {
      const rand = seeded(`${clientId}-${platform}`);
      const connected = (connectedPlatforms as readonly Platform[]).includes(platform) && !(clientId === 'cl-urban' && platform === 'tiktok');
      return {
        id: `int-${clientId}-${platform}`,
        clientId,
        platform,
        handle: `@${slug(name)}`,
        connected,
        followers: connected ? Math.round(2000 + rand() * 48000) : 0,
        lastSyncAt: connected ? new Date(Date.now() - SEED_SYNC_AGE_MS).toISOString() : undefined,
      };
    }),
  );
});

