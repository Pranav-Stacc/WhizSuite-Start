'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition, type ReactNode } from 'react';
import { MoveRight } from 'lucide-react';
import { toast } from 'sonner';
import type { ActionResult } from '@/shared/data/action-result';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Menu } from './overlays';

export interface KanbanColumn {
  id: string;
  title: string;
  /** CSS colour for the column accent dot. */
  color: string;
  summary?: ReactNode;
  action?: ReactNode;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  href?: string;
  content: ReactNode;
}

interface KanbanProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  moveAction: (cardId: string, columnId: string) => Promise<ActionResult>;
  emptyLabel?: string;
}

/** Drag-and-drop board with optimistic moves and a keyboard-friendly "Move to…" menu. */
export function Kanban({ columns, cards, moveAction, emptyLabel }: KanbanProps) {
  const [optimisticCards, applyMove] = useOptimistic(cards, (state, move: { id: string; columnId: string }) =>
    state.map((c) => (c.id === move.id ? { ...c, columnId: move.columnId } : c)),
  );
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const move = (id: string, columnId: string) => {
    const card = optimisticCards.find((c) => c.id === id);
    if (!card || card.columnId === columnId) return;
    startTransition(async () => {
      applyMove({ id, columnId });
      const result = await moveAction(id, columnId);
      if (result.ok) toast.success(t('toast.moved'));
      else toast.error(result.message);
    });
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
      <div className="grid min-w-max auto-cols-[minmax(272px,1fr)] grid-flow-col gap-4 lg:min-w-0">
        {columns.map((column) => {
          const items = optimisticCards.filter((c) => c.columnId === column.id);
          return (
            <section
              key={column.id}
              aria-label={column.title}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(column.id);
              }}
              onDragLeave={() => setOverCol((current) => (current === column.id ? null : current))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') || dragId;
                setOverCol(null);
                setDragId(null);
                if (id) move(id, column.id);
              }}
              className={cn(
                'flex max-h-[calc(100dvh-260px)] min-h-72 flex-col rounded-2xl border border-border-soft bg-surface/60 transition-colors',
                overCol === column.id && 'border-primary/60 bg-primary/5',
              )}
            >
              <header className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: column.color, boxShadow: `0 0 10px ${column.color}` }} />
                  <h3 className="truncate text-sm font-semibold">{column.title}</h3>
                  <span className="rounded-full bg-surface-3 px-1.5 text-[11px] tabular-nums text-muted">{items.length}</span>
                </div>
                {column.action}
              </header>
              {column.summary ? <div className="px-3.5 pb-2 text-xs text-muted">{column.summary}</div> : null}
              <ul className="flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-3">
                {items.map((card) => (
                  <li
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', card.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDragId(card.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    className={cn(
                      'group relative cursor-grab rounded-xl border border-border-soft bg-surface-2 p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg active:cursor-grabbing',
                      dragId === card.id && 'scale-[0.97] opacity-50',
                    )}
                  >
                    {card.href ? (
                      <Link href={card.href} className="block" draggable={false}>
                        {card.content}
                      </Link>
                    ) : (
                      card.content
                    )}
                    <Menu.Root>
                      <Menu.Trigger asChild>
                        <button
                          type="button"
                          aria-label={t('common.more')}
                          className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-surface-3 text-muted opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <MoveRight className="size-3.5" />
                        </button>
                      </Menu.Trigger>
                      <Menu.Content>
                        <Menu.Label>{t('toast.moved')}</Menu.Label>
                        {columns
                          .filter((c) => c.id !== card.columnId)
                          .map((c) => (
                            <Menu.Item key={c.id} onSelect={() => move(card.id, c.id)}>
                              <span className="size-2 rounded-full" style={{ background: c.color }} />
                              {c.title}
                            </Menu.Item>
                          ))}
                      </Menu.Content>
                    </Menu.Root>
                  </li>
                ))}
                {items.length === 0 ? <li className="rounded-xl border border-dashed border-border-soft px-3 py-6 text-center text-xs text-muted">{emptyLabel ?? t('common.noResults')}</li> : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
