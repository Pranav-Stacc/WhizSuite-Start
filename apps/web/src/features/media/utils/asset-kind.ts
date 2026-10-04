import type { AssetKind } from '@agency-os/contracts';

export function assetKindFromMimeType(mimeType: string): AssetKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}
