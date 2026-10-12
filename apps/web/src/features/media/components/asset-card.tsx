'use client';

import { useState } from 'react';
import { FileText, Film, ImageIcon, Play, Trash2 } from 'lucide-react';
import type { AssetKind } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { formatFileSize, relativeTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { MediaThumb } from '@/shared/ui/media-thumb';
import { deleteAssetAction } from '../actions/media.actions';
import type { Asset } from '../data/media.repository';
import { AssetDownloadButton } from './asset-download-button';
import { AssetPreviewDialog } from './asset-preview-dialog';

const KIND_ICON = { image: ImageIcon, video: Film, document: FileText } satisfies Record<AssetKind, typeof ImageIcon>;

interface AssetCardProps {
  asset: Asset;
  clientName?: string;
  canDelete: boolean;
  canDownload: boolean;
}

export function AssetCard({ asset, clientName, canDelete, canDownload }: AssetCardProps) {
  const Icon = KIND_ICON[asset.kind];
  const [previewOpen, setPreviewOpen] = useState(false);
  const playable = asset.kind === 'video' && asset.url && asset.status === 'READY';

  return (
    <article className="card-surface card-hover group overflow-hidden">
      <div className="relative aspect-square border-b border-border-soft bg-surface-2">
        {asset.url ? (
          <button
            type="button"
            className="size-full text-left"
            onClick={() => playable && setPreviewOpen(true)}
            disabled={!playable}
            aria-label={playable ? t('media.play', { name: asset.name }) : asset.name}
          >
            <MediaThumb url={asset.url} mimeType={asset.mimeType} alt={asset.name} />
          </button>
        ) : (
          <div className="grid size-full place-items-center text-muted">
            <Icon className="size-6" aria-hidden />
          </div>
        )}
        {playable ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/20">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-surface/90 opacity-0 shadow transition-opacity group-hover:opacity-100">
              <Play className="size-4 fill-current" aria-hidden />
            </span>
          </span>
        ) : null}
        <span className="absolute left-2 top-2 bg-surface/90 px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.14em]">{t(`media.kind.${asset.kind}`)}</span>
      </div>
      <div className="space-y-2 p-3.5">
        <p className="truncate text-[13px]" title={asset.name}>
          {asset.name}
        </p>
        <p className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{clientName}</span>
          <span className="shrink-0 tabular-nums">{formatFileSize(asset.sizeKb)}</span>
        </p>
        {asset.tags.length ? (
          <ul className="flex flex-wrap gap-1">
            {asset.tags.map((tag) => (
              <li key={tag} className="border border-border-soft px-1.5 py-0.5 text-[10.5px] text-muted">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted">{relativeTime(asset.createdAt)}</span>
          {asset.status !== 'READY' ? (
            asset.status === 'FAILED' ? (
              <Badge tone="danger">{t('media.status.FAILED')}</Badge>
            ) : (
              <Badge tone="warning">{t('media.status.PENDING_UPLOAD')}</Badge>
            )
          ) : null}
          <div className="flex items-center gap-1">
            {playable ? (
              <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
                <Play />
                {t('media.playShort')}
              </Button>
            ) : null}
            {canDownload && asset.status === 'READY' ? <AssetDownloadButton assetId={asset.id} name={asset.name} /> : null}
            {canDelete ? <ConfirmButton action={deleteAssetAction.bind(null, asset.id)} label={t('common.delete')} icon={<Trash2 />} size="sm" /> : null}
          </div>
        </div>
      </div>
      <AssetPreviewDialog asset={asset} open={previewOpen} onOpenChange={setPreviewOpen} />
    </article>
  );
}
