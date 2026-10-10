'use client';

import { useEffect, useState, useTransition, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Clapperboard, Copy, Film, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentStatus, ContentType } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { MediaThumb } from '@/shared/ui/media-thumb';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { reorderGridAction } from '../../actions/content.actions';
import { moveItem } from '../../utils/grid-order';
import { useOptionalPlannerDrawer } from './planner-drawer';

export interface GridTile {
  id: string;
  title: string;
  contentType: ContentType;
  status: ContentStatus;
  dateLabel?: string;
  cover?: { url?: string; mimeType: string };
  slideCount: number;
}

type PhoneLayout = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x';

interface PhoneGridProps {
  clientId: string;
  clientName: string;
  clientInitials: string;
  tiles: GridTile[];
  /** Reordering is a staff action; client previews are read-only. */
  editable?: boolean;
  /** When set, tiles navigate (e.g. select a post in the approval queue) instead of opening the drawer. */
  tileHrefs?: Record<string, string>;
  selectedId?: string;
  /** Visual chrome — defaults to Instagram 3-column profile. */
  layout?: PhoneLayout;
  handle?: string;
  subtitle?: string;
}

const GRID_COLUMNS = 3;
const TYPE_ICON: Partial<Record<ContentType, typeof Copy>> = { CAROUSEL: Copy, REEL: Clapperboard, VIDEO: Film };
const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -GRID_COLUMNS, ArrowDown: GRID_COLUMNS };

const LAYOUT_COLS: Record<PhoneLayout, string> = {
  instagram: 'grid-cols-3',
  tiktok: 'grid-cols-3',
  facebook: 'grid-cols-2',
  linkedin: 'grid-cols-2',
  youtube: 'grid-cols-2',
  x: 'grid-cols-1',
};

const LAYOUT_ASPECT: Record<PhoneLayout, string> = {
  instagram: 'aspect-[4/5]',
  tiktok: 'aspect-[9/16]',
  facebook: 'aspect-square',
  linkedin: 'aspect-[4/3]',
  youtube: 'aspect-video',
  x: 'aspect-[16/9]',
};

/** Platform-shaped profile mock-up of the client's planned feed. Drag tiles (or Alt + arrow keys) to re-plan. */
export function PhoneGrid({
  clientId,
  clientName,
  clientInitials,
  tiles,
  editable = true,
  tileHrefs,
  selectedId,
  layout = 'instagram',
  handle,
  subtitle,
}: PhoneGridProps) {
  const drawer = useOptionalPlannerDrawer();
  const [order, setOrder] = useState(tiles);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => setOrder(tiles), [tiles]);

  const commit = (next: GridTile[]) => {
    const previous = order;
    setOrder(next);
    startSaving(async () => {
      const result = await reorderGridAction({ clientId, orderedIds: next.map((tile) => tile.id) });
      if (!result.ok) {
        setOrder(previous);
        toast.error(result.message);
      }
    });
  };

  const moveTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= order.length) return;
    commit(moveItem(order, from, to));
  };

  const onKeyDown = (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = KEY_STEP[e.key];
    if (!editable || !e.altKey || step === undefined) return;
    e.preventDefault();
    moveTo(index, index + step);
  };

  return (
    <div className="mx-auto w-full max-w-[400px] rounded-[44px] border border-border-strong bg-surface p-3 shadow-[0_30px_60px_-40px_rgb(0_0_0/0.35)]">
      <div className="overflow-hidden rounded-[34px] border border-border-soft bg-background">
        <div className="mx-auto mt-2.5 h-5 w-24 rounded-full bg-foreground" aria-hidden />
        <header className="flex items-center gap-4 px-4 pb-3 pt-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full border border-border bg-surface text-[13px] uppercase tracking-[0.12em]" aria-hidden>
            {clientInitials}
          </span>
          <dl className="grid flex-1 grid-cols-3 text-center">
            <div className="flex flex-col-reverse">
              <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('grid.phone.posts')}</dt>
              <dd className="text-[15px] tabular-nums">{order.length}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('grid.phone.planned')}</dt>
              <dd className="text-[15px] tabular-nums">{order.filter((tile) => tile.status !== 'PUBLISHED').length}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('grid.phone.live')}</dt>
              <dd className="text-[15px] tabular-nums">{order.filter((tile) => tile.status === 'PUBLISHED').length}</dd>
            </div>
          </dl>
        </header>
        <div className="px-4 pb-3">
          <p className="text-[13px] font-medium">{clientName}</p>
          {handle ? <p className="text-[11px] text-muted">@{handle.replace(/^@/, '')}</p> : null}
          {subtitle ? <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex items-center justify-between border-y border-border-soft px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted">
          <span>{t('grid.phone.feed')}</span>
          <span aria-live="polite">{saving ? t('grid.saving') : editable ? t('grid.hint') : null}</span>
        </div>

        <ol className={cn('grid gap-px bg-border-soft', LAYOUT_COLS[layout])} aria-label={t('grid.phone.feed')}>
          {editable && drawer ? (
            <li className="bg-background">
              <button
                type="button"
                onClick={() => drawer.newPost()}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-1.5 text-muted transition hover:bg-surface hover:text-foreground',
                  LAYOUT_ASPECT[layout],
                )}
              >
                <Plus className="size-4" aria-hidden />
                <span className="text-[9.5px] uppercase tracking-[0.16em]">{t('grid.newPost')}</span>
              </button>
            </li>
          ) : null}
          {order.map((tile, index) => {
            const TypeIcon = TYPE_ICON[tile.contentType];
            const href = tileHrefs?.[tile.id];
            const label = t('grid.tile.label', { title: tile.title, status: statusLabel('content', tile.status), position: index + 1 });
            const tileClass = cn(
              'group relative block w-full overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground',
              LAYOUT_ASPECT[layout],
              editable && 'cursor-grab active:cursor-grabbing',
              selectedId === tile.id && 'outline outline-2 -outline-offset-2 outline-foreground',
            );
            const face = (
              <>
                <MediaThumb url={tile.cover?.url} mimeType={tile.cover?.mimeType} alt="" placeholder={tile.title} className="transition duration-300 group-hover:scale-[1.03]" />
                {TypeIcon ? <TypeIcon className="absolute right-1.5 top-1.5 size-3.5 text-white drop-shadow" aria-hidden /> : null}
                <span className="absolute bottom-1.5 left-1.5 size-2 rounded-full ring-2 ring-background" style={{ background: TONE_COLOR[statusTone('content', tile.status)] }} aria-hidden />
                {tile.dateLabel ? (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-right text-[9.5px] uppercase tracking-[0.12em] text-white opacity-0 transition group-hover:opacity-100">
                    {tile.dateLabel}
                  </span>
                ) : null}
              </>
            );
            return (
              <li
                key={tile.id}
                draggable={editable}
                onDragStart={() => setDragFrom(index)}
                onDragEnter={() => setDragOver(index)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) moveTo(dragFrom, index);
                  setDragFrom(null);
                  setDragOver(null);
                }}
                className={cn('relative bg-background', dragFrom === index && 'opacity-40', dragOver === index && dragFrom !== index && 'outline outline-2 -outline-offset-2 outline-foreground')}
              >
                {href ? (
                  <Link href={href} scroll={false} aria-label={label} aria-current={selectedId === tile.id ? 'true' : undefined} className={tileClass}>
                    {face}
                  </Link>
                ) : (
                  <button type="button" onClick={() => drawer?.openPost(tile.id)} onKeyDown={onKeyDown(index)} aria-label={label} className={tileClass}>
                    {face}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
