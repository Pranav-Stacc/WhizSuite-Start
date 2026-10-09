import type { ContentStatus, ContentType, Platform } from '@agency-os/contracts';
import { toDateTimeLocal } from '@/shared/lib/format';
import { resetsApprovalOnEdit } from '../workflow';
import type { ComposerAsset, ComposerClient, ComposerPost } from './content-composer';

interface ClientLike {
  id: string;
  name: string;
  color: string;
  platforms: Platform[];
  status: string;
  brand: { hashtags: string[]; voice: string; pillars: string[] };
}

interface PostLike {
  id: string;
  title: string;
  clientId: string;
  status: ContentStatus;
  contentType: ContentType;
  caption: string;
  platforms: Platform[];
  scheduledAt?: string;
  hashtags: string[];
  ctaUrl?: string;
  pillar?: string;
  media: { assetId: string; name: string; mimeType: string; url?: string }[];
}

interface AssetLike {
  id: string;
  clientId: string;
  name: string;
  mimeType: string;
  status: string;
  url?: string;
}

const INACTIVE_CLIENT_STATUS = 'CHURNED';
const READY_ASSET_STATUS = 'READY';

/** Churned clients cannot receive new content, so they are left out of the composer. */
export function toComposerClients(clients: ClientLike[]): ComposerClient[] {
  return clients
    .filter((c) => c.status !== INACTIVE_CLIENT_STATUS)
    .map((c) => ({ id: c.id, name: c.name, color: c.color, platforms: c.platforms, hashtags: c.brand.hashtags, pillars: c.brand.pillars, voice: c.brand.voice }));
}

export function toComposerPost(post: PostLike): ComposerPost {
  return {
    id: post.id,
    title: post.title,
    clientId: post.clientId,
    contentType: post.contentType,
    caption: post.caption,
    platforms: post.platforms,
    scheduledAt: post.scheduledAt ? toDateTimeLocal(post.scheduledAt) : '',
    hashtags: post.hashtags,
    ctaUrl: post.ctaUrl ?? '',
    pillar: post.pillar ?? '',
    slides: post.media.map((m) => ({ assetId: m.assetId, name: m.name, mimeType: m.mimeType, url: m.url })),
    resetsApproval: resetsApprovalOnEdit(post.status),
  };
}

/** Only ready assets can be attached as slides. */
export function toComposerAssets(assets: AssetLike[]): ComposerAsset[] {
  return assets
    .filter((a) => a.status === READY_ASSET_STATUS)
    .map((a) => ({ assetId: a.id, clientId: a.clientId, name: a.name, mimeType: a.mimeType, url: a.url }));
}
