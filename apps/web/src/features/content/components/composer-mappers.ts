import type { ContentType, Platform } from '@agency-os/contracts';
import { toDateTimeLocal } from '@/shared/lib/format';
import type { ComposerClient, ComposerPost } from './content-composer';

interface ClientLike {
  id: string;
  name: string;
  color: string;
  platforms: Platform[];
  status: string;
  brand: { hashtags: string[]; voice: string };
}

interface PostLike {
  id: string;
  title: string;
  clientId: string;
  contentType: ContentType;
  caption: string;
  platforms: Platform[];
  scheduledAt?: string;
}

const INACTIVE_CLIENT_STATUS = 'CHURNED';

/** Churned clients cannot receive new content, so they are left out of the composer. */
export function toComposerClients(clients: ClientLike[]): ComposerClient[] {
  return clients
    .filter((c) => c.status !== INACTIVE_CLIENT_STATUS)
    .map((c) => ({ id: c.id, name: c.name, color: c.color, platforms: c.platforms, hashtags: c.brand.hashtags, voice: c.brand.voice }));
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
  };
}
