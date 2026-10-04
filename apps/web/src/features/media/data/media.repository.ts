import 'server-only';
import type { AssetKind, MediaAssetStatus } from '@agency-os/contracts';
import { mediaLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface Asset extends Entity {
  clientId: string;
  name: string;
  kind: AssetKind;
  mimeType: string;
  status: MediaAssetStatus;
  sizeKb: number;
  tags: string[];
  hue: number;
  uploadedBy: string;
  createdAt: string;
}

type Seed = [id: string, clientId: string, name: string, kind: AssetKind, sizeKb: number, tags: string[], hue: number];

export const DEMO_MIME_TYPES: Record<AssetKind, string> = { image: 'image/jpeg', video: 'video/mp4', document: 'application/pdf' };

const SEEDS: Seed[] = [
  ['a1', 'cl-lumen', 'winter-blend-hero.jpg', 'image', 2840, ['hero', 'winter'], 32],
  ['a2', 'cl-lumen', 'latte-art-closeup.jpg', 'image', 1930, ['latte', 'ugc'], 24],
  ['a3', 'cl-lumen', 'brand-guidelines-2026.pdf', 'document', 5120, ['brand'], 40],
  ['a4', 'cl-lumen', 'barista-foam-tips.mp4', 'video', 48210, ['reel', 'tips'], 28],
  ['a5', 'cl-orbit', 'challenge-kickoff.mp4', 'video', 92300, ['reel', 'challenge'], 200],
  ['a6', 'cl-orbit', 'logo-lockup-v3.png', 'image', 420, ['logo'], 205],
  ['a7', 'cl-orbit', 'trainer-portraits.jpg', 'image', 3300, ['people'], 195],
  ['a8', 'cl-verde', 'niacinamide-flatlay.jpg', 'image', 2100, ['product', 'flatlay'], 150],
  ['a9', 'cl-verde', 'derm-interview-raw.mp4', 'video', 214000, ['interview'], 155],
  ['a10', 'cl-nimbus', 'nimbus-3-dashboard.png', 'image', 1200, ['product', 'ui'], 262],
  ['a11', 'cl-nimbus', 'launch-deck.pdf', 'document', 8800, ['launch'], 268],
  ['a12', 'cl-nimbus', 'founder-headshot.jpg', 'image', 980, ['people'], 258],
  ['a13', 'cl-urban', 'autumn-lookbook-01.jpg', 'image', 4100, ['lookbook'], 350],
  ['a14', 'cl-urban', 'autumn-lookbook-02.jpg', 'image', 3900, ['lookbook'], 352],
];

export const mediaRepository = createRepository<Asset>('media', () =>
  SEEDS.map(([id, clientId, name, kind, sizeKb, tags, hue], i) => ({
    id,
    clientId,
    name,
    kind,
    mimeType: DEMO_MIME_TYPES[kind],
    status: 'READY' as const,
    sizeKb,
    tags,
    hue,
    uploadedBy: i % 2 ? 'm-rohan' : 'm-kabir',
    createdAt: daysFromNow(-(i + 1)),
  })),
  mediaLive,
);
