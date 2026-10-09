import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { toDateKey } from '@/shared/lib/format';
import { MediaThumb } from '@/shared/ui/media-thumb';
import { StatusBadge } from '@/shared/ui/status';
import type { Post } from '../../data/content.repository';
import { NewPostButton, OpenPostButton } from './planner-drawer';

export interface SheetColumn {
  key: string;
  /** Local day this column belongs to; absent for unscheduled posts. */
  day?: Date;
  post?: Post;
  /** Latest conversation message, shown in the Notes row. */
  note?: string;
}

interface SheetRow {
  label: MessageKey;
  render: (post: Post, column: SheetColumn) => ReactNode;
  className?: string;
}

const DEFAULT_SLOT_TIME = 'T10:00';

const ROWS: SheetRow[] = [
  { label: 'sheet.row.type', render: (p) => <span className="text-[10.5px] uppercase tracking-[0.14em]">{t(`type.content.${p.contentType}`)}</span> },
  {
    label: 'sheet.row.name',
    render: (p) => (
      <OpenPostButton postId={p.id} className="font-medium underline-offset-4 hover:underline">
        {p.title}
      </OpenPostButton>
    ),
  },
  {
    label: 'sheet.row.visual',
    render: (p) => (
      <OpenPostButton postId={p.id} label={p.title} className="relative block aspect-[4/5] w-full overflow-hidden border border-border-soft">
        <MediaThumb url={p.media[0]?.url} mimeType={p.media[0]?.mimeType} alt="" placeholder={t('sheet.noVisual')} />
        {p.media.length > 1 ? <span className="absolute right-1.5 top-1.5 bg-surface/90 px-1.5 text-[10px] tabular-nums">{t('content.preview.slides', { count: p.media.length })}</span> : null}
      </OpenPostButton>
    ),
  },
  { label: 'sheet.row.caption', render: (p) => <p className="line-clamp-[8] whitespace-pre-line">{p.caption || '—'}</p> },
  { label: 'sheet.row.hashtags', render: (p) => <p className="text-muted">{p.hashtags.join(' ') || '—'}</p> },
  {
    label: 'sheet.row.cta',
    render: (p) =>
      p.ctaUrl ? (
        <a href={p.ctaUrl} target="_blank" rel="noreferrer noopener" className="break-all underline-offset-4 hover:underline">
          {p.ctaUrl}
        </a>
      ) : (
        '—'
      ),
  },
  { label: 'sheet.row.pillar', render: (p) => p.pillar ?? '—' },
  { label: 'sheet.row.status', render: (p) => <StatusBadge kind="content" value={p.status} /> },
  { label: 'sheet.row.notes', render: (_, c) => <p className="line-clamp-4 text-muted">{c.note ?? '—'}</p> },
];

function dayHeading(day: Date | undefined): { weekday: string; date: string } {
  if (!day) return { weekday: t('sheet.unscheduled'), date: '' };
  return {
    weekday: day.toLocaleDateString(undefined, { weekday: 'long' }),
    date: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  };
}

/** Spreadsheet calendar: one column per post (or empty day), one row per field. */
export function ContentSheet({ columns }: { columns: SheetColumn[] }) {
  const todayKey = toDateKey(new Date());
  if (!columns.length) return <p className="border border-border bg-surface px-6 py-16 text-center text-[13px] text-muted">{t('sheet.empty')}</p>;
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="border-collapse text-[12.5px] leading-relaxed">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-36 min-w-36 border-b border-r border-border bg-surface px-4 py-3 text-left">
              <span className="sr-only">{t('sheet.field')}</span>
            </th>
            {columns.map((column) => {
              const heading = dayHeading(column.day);
              const isToday = column.day && toDateKey(column.day) === todayKey;
              return (
                <th key={column.key} scope="col" className="w-60 min-w-60 border-b border-r border-border px-4 py-3 text-left align-top font-normal">
                  <span className={cn('block text-[10.5px] uppercase tracking-[0.16em]', isToday ? 'text-foreground' : 'text-muted')}>{heading.weekday}</span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-[15px]">
                    {heading.date}
                    {column.post && column.post.scheduledAt ? <span className="text-[11px] tabular-nums text-muted">{new Date(column.post.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span> : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="sticky left-0 z-10 border-b border-r border-border bg-surface px-4 py-3 text-left align-top text-[10.5px] font-normal uppercase tracking-[0.16em] text-muted">
                {t(row.label)}
              </th>
              {columns.map((column) => (
                <td key={column.key} className="border-b border-r border-border-soft px-4 py-3 align-top">
                  {column.post ? (
                    row.render(column.post, column)
                  ) : row.label === 'sheet.row.visual' && column.day ? (
                    <NewPostButton
                      scheduledAt={`${toDateKey(column.day)}${DEFAULT_SLOT_TIME}`}
                      label={t('sheet.newOn', { date: dayHeading(column.day).date })}
                      className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 border border-dashed border-border text-muted transition hover:border-foreground hover:text-foreground"
                    >
                      <Plus className="size-4" aria-hidden />
                      <span className="text-[10px] uppercase tracking-[0.16em]">{t('sheet.empty.slot')}</span>
                    </NewPostButton>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
