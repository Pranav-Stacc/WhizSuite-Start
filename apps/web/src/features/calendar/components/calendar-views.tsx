import Link from 'next/link';
import {
  Camera,
  CheckSquare,
  ClipboardCheck,
  Flag,
  Megaphone,
  PencilLine,
  Receipt,
  CalendarDays,
} from 'lucide-react';
import {
  ContentStatuses,
  TaskStatuses,
  type ContentStatus,
  type TaskStatus,
} from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { formatDate, toDateKey } from '@/shared/lib/format';
import { MediaThumb } from '@/shared/ui/media-thumb';
import { PlatformStack } from '@/shared/ui/platform';
import { StatusBadge } from '@/shared/ui/status';
import type { CalendarItem, CalendarKind } from '../services/calendar.service';

function asContentStatus(value: string | undefined): ContentStatus | undefined {
  return ContentStatuses.find((s) => s === value);
}

function asTaskStatus(value: string | undefined): TaskStatus | undefined {
  return TaskStatuses.find((s) => s === value);
}

const MAX_CHIPS_PER_DAY = 8;

const KIND_ICON: Record<CalendarKind, typeof PencilLine> = {
  content: PencilLine,
  task: CheckSquare,
  shoot: Camera,
  approval: ClipboardCheck,
  campaign: Megaphone,
  invoice: Receipt,
  milestone: Flag,
  meeting: CalendarDays,
  deadline: Flag,
  manual: CalendarDays,
};

function kindLabel(kind: CalendarKind): string {
  switch (kind) {
    case 'content':
      return t('calendar.legend.content');
    case 'task':
      return t('calendar.legend.tasks');
    case 'shoot':
      return t('calendar.legend.shoots');
    case 'approval':
      return t('calendar.legend.approvals');
    case 'campaign':
      return t('calendar.legend.campaigns');
    case 'invoice':
      return t('calendar.legend.invoices');
    case 'milestone':
      return t('calendar.legend.milestones');
    case 'meeting':
      return t('calendar.legend.meetings');
    case 'deadline':
      return t('calendar.legend.deadlines');
    default:
      return t('calendar.legend.manual');
  }
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function ItemChip({ item }: { item: CalendarItem }) {
  const Icon = KIND_ICON[item.kind] ?? CalendarDays;
  const thumb = item.kind === 'content' ? item.thumb : undefined;
  return (
    <Link
      href={item.href}
      title={`${kindLabel(item.kind)}: ${item.title}${item.platforms?.length ? ` · ${item.platforms.join(', ')}` : ''}`}
      className="relative z-10 flex items-center gap-1.5 truncate border-l-2 bg-surface px-1.5 py-1 text-[11px] leading-tight transition-colors hover:bg-surface-2"
      style={{ borderLeftColor: item.clientColor || 'var(--border)' }}
    >
      {thumb ? (
        <span className="size-5 shrink-0 overflow-hidden">
          <MediaThumb url={thumb.url} mimeType={thumb.mimeType} alt="" />
        </span>
      ) : (
        <Icon className="size-3 shrink-0 text-muted" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.kind === 'content' && item.platforms?.length ? <PlatformStack platforms={item.platforms} size="xs" /> : null}
    </Link>
  );
}

interface MonthGridProps {
  days: Date[];
  month: number;
  itemsByDay: Map<string, CalendarItem[]>;
  weekdayLabels: string[];
  /** When set, day cells open this href (e.g. `?day=YYYY-MM-DD`). */
  dayHref?: (dateKey: string) => string;
  selectedDay?: string;
}

export function MonthGrid({ days, month, itemsByDay, weekdayLabels, dayHref, selectedDay }: MonthGridProps) {
  const todayKey = toDateKey(new Date());
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-border text-[10.5px] uppercase tracking-[0.16em] text-muted">
          {weekdayLabels.map((label) => (
            <div key={label} className="px-2.5 py-2.5">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = toDateKey(day);
            const items = itemsByDay.get(key) ?? [];
            const inMonth = day.getMonth() === month;
            const selected = selectedDay === key;
            const cellClass = cn(
              'relative min-h-36 border-b border-r border-border-soft p-2 transition-colors [&:nth-child(7n)]:border-r-0',
              !inMonth && 'bg-background/60',
              dayHref && 'hover:bg-surface-2/80',
              selected && 'ring-1 ring-inset ring-foreground/40',
            );

            const body = (
              <>
                <div className="mb-1.5 flex items-baseline justify-between gap-1">
                  <p
                    className={cn(
                      'inline-block px-0.5 text-[12px] tabular-nums',
                      key === todayKey
                        ? 'border-b border-foreground text-foreground'
                        : inMonth
                          ? 'text-foreground'
                          : 'text-muted/50',
                    )}
                  >
                    {day.getDate()}
                  </p>
                  {items.length > 1 ? (
                    <span className="text-[10px] tabular-nums text-muted" title={t('calendar.day.count', { count: items.length })}>
                      {items.length}
                    </span>
                  ) : null}
                </div>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {items.slice(0, MAX_CHIPS_PER_DAY).map((item) => (
                    <li key={`${item.kind}-${item.id}-${item.at}`}>
                      <ItemChip item={item} />
                    </li>
                  ))}
                </ul>
                {items.length > MAX_CHIPS_PER_DAY ? (
                  <p className="mt-1 px-1 text-[11px] text-muted">{t('calendar.more', { count: items.length - MAX_CHIPS_PER_DAY })}</p>
                ) : null}
              </>
            );

            return (
              <div key={key} className={cellClass}>
                {dayHref ? (
                  <Link
                    href={dayHref(key)}
                    className="absolute inset-0 z-0"
                    aria-label={t('calendar.day.open', {
                      date: formatDate(key, { weekday: 'long', day: 'numeric', month: 'long' }),
                    })}
                    aria-current={selected ? 'date' : undefined}
                  />
                ) : null}
                <div className="relative z-10">{body}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Agenda({ itemsByDay }: { itemsByDay: Map<string, CalendarItem[]> }) {
  const days = [...itemsByDay.keys()].sort();
  return (
    <ol className="space-y-5">
      {days.map((key) => (
        <li key={key}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{formatDate(key, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <ul className="card-surface divide-y divide-border-soft">
            {(itemsByDay.get(key) ?? []).map((item) => (
              <li key={`${item.kind}-${item.id}-${item.at}`}>
                <Link href={item.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                  <span className="h-8 w-1 rounded-full" style={{ background: item.clientColor || 'var(--border)' }} />
                  <span className="w-16 shrink-0 text-xs tabular-nums text-muted">{timeOf(item.at)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted">{kindLabel(item.kind)}</span>
                  </span>
                  {(() => {
                    const contentStatus = item.kind === 'content' ? asContentStatus(item.status) : undefined;
                    const taskStatus = item.kind === 'task' ? asTaskStatus(item.status) : undefined;
                    if (item.kind === 'content' && item.platforms) {
                      return (
                        <>
                          <PlatformStack platforms={item.platforms} size="xs" />
                          {contentStatus ? <StatusBadge kind="content" value={contentStatus} dot={false} /> : null}
                        </>
                      );
                    }
                    if (taskStatus) return <StatusBadge kind="task" value={taskStatus} dot={false} />;
                    return null;
                  })()}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
