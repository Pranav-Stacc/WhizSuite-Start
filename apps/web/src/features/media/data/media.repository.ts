import 'server-only';
import type { AssetKind, MediaAssetStatus } from '@agency-os/contracts';
import { mediaLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';
import { demoImageUrl } from '@/shared/lib/demo-media';

export interface Asset extends Entity {
  clientId: string;
  name: string;
  kind: AssetKind;
  mimeType: string;
  status: MediaAssetStatus;
  sizeKb: number;
  tags: string[];
  uploadedBy: string;
  createdAt: string;
  folderId?: string | null;
  projectId?: string | null;
  /** Inline preview URL, present only for ready assets. */
  url?: string;
}

type Seed = [id: string, clientId: string, name: string, kind: AssetKind, sizeKb: number, tags: string[]];

export const DEMO_MIME_TYPES: Record<AssetKind, string> = { image: 'image/jpeg', video: 'video/mp4', document: 'application/pdf' };

const SEEDS: Seed[] = [
  ['a1', 'cl-lumen', 'winter-blend-hero.jpg', 'image', 2840, ['hero', 'winter']],
  ['a2', 'cl-lumen', 'latte-art-closeup.jpg', 'image', 1930, ['latte', 'ugc']],
  ['a3', 'cl-lumen', 'brand-guidelines-2026.pdf', 'document', 5120, ['brand']],
  ['a4', 'cl-lumen', 'barista-foam-tips.mp4', 'video', 48210, ['reel', 'tips']],
  ['a15', 'cl-lumen', 'roastery-morning.jpg', 'image', 2210, ['roastery']],
  ['a16', 'cl-lumen', 'pour-over-steps.jpg', 'image', 1780, ['education']],
  ['a17', 'cl-lumen', 'cafe-interior.jpg', 'image', 2650, ['space']],
  ['a5', 'cl-orbit', 'challenge-kickoff.mp4', 'video', 92300, ['reel', 'challenge']],
  ['a6', 'cl-orbit', 'logo-lockup-v3.png', 'image', 420, ['logo']],
  ['a7', 'cl-orbit', 'trainer-portraits.jpg', 'image', 3300, ['people']],
  ['a8', 'cl-verde', 'niacinamide-flatlay.jpg', 'image', 2100, ['product', 'flatlay']],
  ['a9', 'cl-verde', 'derm-interview-raw.mp4', 'video', 214000, ['interview']],
  ['a10', 'cl-nimbus', 'nimbus-3-dashboard.png', 'image', 1200, ['product', 'ui']],
  ['a11', 'cl-nimbus', 'launch-deck.pdf', 'document', 8800, ['launch']],
  ['a12', 'cl-nimbus', 'founder-headshot.jpg', 'image', 980, ['people']],
  ['a13', 'cl-urban', 'autumn-lookbook-01.jpg', 'image', 4100, ['lookbook']],
  ['a14', 'cl-urban', 'autumn-lookbook-02.jpg', 'image', 3900, ['lookbook']],
];

export const mediaRepository = createRepository<Asset>('media', () =>
  SEEDS.map(([id, clientId, name, kind, sizeKb, tags], i) => ({
    id,
    clientId,
    name,
    kind,
    mimeType: DEMO_MIME_TYPES[kind],
    status: 'READY' as const,
    sizeKb,
    tags,
    uploadedBy: i % 2 ? 'm-rohan' : 'm-kabir',
    createdAt: daysFromNow(-(i + 1)),
    url: kind === 'image' ? demoImageUrl(id) : undefined,
  })),
  mediaLive,
);
