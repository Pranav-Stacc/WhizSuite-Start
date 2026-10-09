'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import type { Asset } from '../data/media.repository';
import { AssetCard } from './asset-card';
import { MediaBulkBar } from './media-bulk-bar';

export function SelectableAssetGrid({
  assets,
  clientNames,
  canDelete,
  canDownload,
}: {
  assets: Asset[];
  clientNames: Record<string, string>;
  canDelete: boolean;
  canDownload: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assets.map((asset) => {
          const checked = selected.has(asset.id);
          return (
            <li key={asset.id} className="relative">
              <label className="absolute left-2 top-2 z-10">
                <span className="sr-only">Select {asset.name}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(asset.id)}
                  className="size-4 accent-[var(--primary)]"
                />
              </label>
              <div className={cn(checked && 'ring-2 ring-foreground/40')}>
                <AssetCard
                  asset={asset}
                  clientName={clientNames[asset.clientId]}
                  canDelete={canDelete}
                  canDownload={canDownload}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <MediaBulkBar selectedIds={[...selected]} onClear={() => setSelected(new Set())} />
    </>
  );
}
