'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, X } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { MediaThumb } from '@/shared/ui/media-thumb';
import { moveItem as move } from '../utils/grid-order';

export interface ComposerSlide {
  assetId: string;
  name: string;
  mimeType: string;
  url?: string;
}

export interface ComposerAsset extends ComposerSlide {
  clientId: string;
}

type LibraryScope = 'all' | 'client';

interface SlidePickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Post client — used for “this client only” filter and badges. */
  postClientId: string;
  clientNames: Record<string, string>;
  /** Every slide that may appear in `value` (current slides plus the library). */
  known: ComposerSlide[];
  /** Assets that can be added. */
  library: ComposerAsset[];
  /** Refetch when the member opens the library (live mode). */
  onBrowseOpen?: () => void;
  libraryLoading?: boolean;
}

const iconButton = 'grid size-6 place-items-center bg-surface/90 text-foreground transition hover:bg-foreground hover:text-background disabled:opacity-30';

export function SlidePicker({
  value,
  onChange,
  postClientId,
  clientNames,
  known,
  library,
  onBrowseOpen,
  libraryLoading = false,
}: SlidePickerProps) {
  const [browsing, setBrowsing] = useState(false);
  const [scope, setScope] = useState<LibraryScope>('all');
  const byId = new Map(known.map((s) => [s.assetId, s]));
  const selected = new Set(value);
  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  const visibleLibrary =
    scope === 'client' ? library.filter((asset) => asset.clientId === postClientId) : library;

  useEffect(() => {
    if (browsing) onBrowseOpen?.();
  }, [browsing, onBrowseOpen]);

  const openBrowse = () => setBrowsing(true);

  return (
    <section aria-labelledby="slides-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="slides-heading" className="eyebrow">
          {t('content.composer.slides', { count: value.length })}
        </h3>
        <button type="button" onClick={() => setBrowsing((b) => !b)} aria-expanded={browsing} className="nav-link">
          {browsing ? t('content.composer.slides.done') : t('content.composer.slides.pick')}
        </button>
      </div>

      {value.length ? (
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {value.map((id, index) => {
            const slide = byId.get(id);
            return (
              <li key={id} className="group relative aspect-[4/5] w-28 shrink-0 overflow-hidden border border-border bg-surface-2">
                <MediaThumb url={slide?.url} mimeType={slide?.mimeType} alt={slide?.name ?? ''} />
                <span className="absolute left-1.5 top-1.5 bg-surface/90 px-1.5 text-[10px] tabular-nums">{index + 1}</span>
                <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button type="button" className={iconButton} disabled={index === 0} onClick={() => onChange(move(value, index, index - 1))} aria-label={t('content.composer.slides.earlier', { n: index + 1 })}>
                    <ArrowLeft className="size-3" />
                  </button>
                  <button type="button" className={iconButton} onClick={() => toggle(id)} aria-label={t('content.composer.slides.remove', { n: index + 1 })}>
                    <X className="size-3" />
                  </button>
                  <button type="button" className={iconButton} disabled={index === value.length - 1} onClick={() => onChange(move(value, index, index + 1))} aria-label={t('content.composer.slides.later', { n: index + 1 })}>
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              </li>
            );
          })}
          <li className="shrink-0">
            <button type="button" onClick={openBrowse} className="grid aspect-[4/5] w-28 place-items-center border border-dashed border-border text-muted transition hover:border-foreground hover:text-foreground" aria-label={t('content.composer.slides.pick')}>
              <Plus className="size-4" />
            </button>
          </li>
        </ol>
      ) : (
        <button type="button" onClick={openBrowse} className="flex h-28 w-full flex-col items-center justify-center gap-2 border border-dashed border-border text-[12px] text-muted transition hover:border-foreground hover:text-foreground">
          <Plus className="size-4" aria-hidden />
          {t('content.composer.slides.empty')}
        </button>
      )}

      {browsing ? (
        <div className="space-y-3 border-t border-border-soft pt-3">
          <p className="text-[12px] leading-relaxed text-muted">{t('content.composer.slides.libraryHint')}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('content.composer.slides.filter.all')}>
            <button
              type="button"
              aria-pressed={scope === 'all'}
              onClick={() => setScope('all')}
              className={cn(
                'h-7 border px-2.5 text-[10.5px] uppercase tracking-[0.12em] transition',
                scope === 'all' ? 'border-foreground text-foreground' : 'border-border text-muted hover:text-foreground',
              )}
            >
              {t('content.composer.slides.filter.all')}
            </button>
            <button
              type="button"
              aria-pressed={scope === 'client'}
              onClick={() => setScope('client')}
              className={cn(
                'h-7 border px-2.5 text-[10.5px] uppercase tracking-[0.12em] transition',
                scope === 'client' ? 'border-foreground text-foreground' : 'border-border text-muted hover:text-foreground',
              )}
            >
              {t('content.composer.slides.filter.client')}
            </button>
            {libraryLoading ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden /> : null}
          </div>
          {visibleLibrary.length ? (
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {visibleLibrary.map((asset) => {
                const order = value.indexOf(asset.assetId);
                const active = order !== -1;
                const clientLabel = clientNames[asset.clientId];
                const showClient = scope === 'all' && asset.clientId !== postClientId && clientLabel;
                return (
                  <li key={asset.assetId}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(asset.assetId)}
                      title={showClient ? `${asset.name} · ${clientLabel}` : asset.name}
                      className={cn('relative block aspect-square w-full overflow-hidden border transition', active ? 'border-foreground' : 'border-border hover:border-border-strong')}
                    >
                      <MediaThumb url={asset.url} mimeType={asset.mimeType} alt={asset.name} />
                      {showClient ? (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-surface/90 px-1 py-0.5 text-[9px] text-foreground">
                          {t('content.composer.slides.clientBadge', { name: clientLabel })}
                        </span>
                      ) : null}
                      {active ? (
                        <span className="absolute right-1 top-1 grid size-5 place-items-center bg-foreground text-[10px] text-background">
                          {order + 1}
                        </span>
                      ) : (
                        <span className="absolute right-1 top-1 grid size-5 place-items-center border border-surface/80 bg-surface/40 opacity-0 transition hover:opacity-100">
                          <Check className="size-3" aria-hidden />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[12px] text-muted">
              {scope === 'client' && library.length ? t('content.composer.slides.noAssetsFiltered') : t('content.composer.slides.noAssets')}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
