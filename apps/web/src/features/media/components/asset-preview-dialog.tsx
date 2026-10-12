'use client';

import { PlayableMedia } from '@/shared/ui/playable-media';
import { Modal } from '@/shared/ui/overlays';
import type { Asset } from '../data/media.repository';

interface AssetPreviewDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetPreviewDialog({ asset, open, onOpenChange }: AssetPreviewDialogProps) {
  if (!asset) return null;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={asset.name} size="lg">
      <div className="aspect-square max-h-[70vh] w-full overflow-hidden border border-border-soft bg-black">
        {asset.url ? (
          <PlayableMedia url={asset.url} mimeType={asset.mimeType} alt={asset.name} controls />
        ) : null}
      </div>
    </Modal>
  );
}
