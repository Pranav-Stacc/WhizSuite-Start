'use client';

import { Plus } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { MediaThumb } from '@/shared/ui/media-thumb';
import { usePlannerDrawer } from './planner-drawer';

export interface TrayAsset {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
  /** Already used as a slide in at least one post. */
  used: boolean;
}

/** The client's ready assets; pick one to start a post with it as the first slide. */
export function AssetTray({ assets }: { assets: TrayAsset[] }) {
  const { newPost, canCreate } = usePlannerDrawer();
  if (!assets.length) return <p className="text-[12px] text-muted">{t('grid.tray.empty')}</p>;
  return (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <li key={asset.id}>
          {canCreate ? (
            <button
              type="button"
              onClick={() => newPost({ assetIds: [asset.id] })}
              title={asset.name}
              aria-label={t('grid.tray.start', { name: asset.name })}
              className="group relative block aspect-square w-full overflow-hidden border border-border transition hover:border-foreground"
            >
              <MediaThumb url={asset.url} mimeType={asset.mimeType} alt="" placeholder={asset.name} />
              <span className="absolute inset-0 grid place-items-center bg-foreground/50 text-background opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <Plus className="size-4" aria-hidden />
              </span>
              {asset.used ? <span className="absolute left-1 top-1 bg-surface/90 px-1 text-[9px] uppercase tracking-[0.12em]">{t('grid.tray.used')}</span> : null}
            </button>
          ) : (
            <div
              title={asset.name}
              className="relative block aspect-square w-full overflow-hidden border border-border"
            >
              <MediaThumb url={asset.url} mimeType={asset.mimeType} alt="" placeholder={asset.name} />
              {asset.used ? <span className="absolute left-1 top-1 bg-surface/90 px-1 text-[9px] uppercase tracking-[0.12em]">{t('grid.tray.used')}</span> : null}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
