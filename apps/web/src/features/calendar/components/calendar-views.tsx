import Link from 'next/link';
import { CheckSquare, PencilLine } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { formatDate, toDateKey } from '@/shared/lib/format';
import { PlatformStack } from '@/shared/ui/platform';
import { StatusBadge } from '@/shared/ui/status';
import type { CalendarItem } from '../services/calendar.service';

const MAX_CHIPS_PER_DAY = 3;

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function ItemChip({ item }: { item: CalendarItem }) {
  const Icon = item.kind === 'content' ? PencilLine : CheckSquare;
  return (
    <Link
      href={item.href}
      title={item.title}
      className="flex items-center gap-1.5 truncate rounded-md border-l-2 bg-surface-2 px-1.5 py-1 text-[11px] leading-tight transition-colors hover:bg-surface-3"
      style={{ borderLeftColor: item.clientColor }}
    >
      <Icon className="size-3 shrink-0 text-muted" aria-hidden />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}

interface MonthGridProps {
  days: Date[];
  month: number;
  itemsByDay: Map<string, CalendarItem[]>;
  weekdayLabels: string[];
}

export function MonthGrid({ days, month, itemsByDay, weekdayLabels }: MonthGridProps) {
  const todayKey = toDateKey(new Date());
  return (
    <div className="card-surface overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-border-soft text-center text-xs font-medium uppercase tracking-wide text-muted">
          {weekdayLabels.map((label) => (
            <div key={label} className="py-2.5">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = toDateKey(day);
            const items = itemsByDay.get(key) ?? [];
            const inMonth = day.getMonth() === month;
            return (
              <div key={key} className={cn('min-h-28 border-b border-r border-border-soft p-1.5 [&:nth-child(7n)]:border-r-0', !inMonth && 'bg-surface/40')}>
                <p className={cn('mb-1 inline-grid size-6 place-items-center rounded-full text-xs tabular-nums', key === todayKey ? 'bg-primary font-semibold text-primary-contrast' : inMonth ? 'text-foreground' : 'text-muted/50')}>
                  {day.getDate()}
                </p>
                <ul className="space-y-1">
                  {items.slice(0, MAX_CHIPS_PER_DAY).map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <ItemChip item={item} />
                    </li>
                  ))}
                </ul>
                {items.length > MAX_CHIPS_PER_DAY ? <p className="mt-1 px-1 text-[11px] text-muted">{t('calendar.more', { count: items.length - MAX_CHIPS_PER_DAY })}</p> : null}
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
              <li key={`${item.kind}-${item.id}`}>
                <Link href={item.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                  <span className="h-8 w-1 rounded-full" style={{ background: item.clientColor }} />
                  <span className="w-16 shrink-0 text-xs tabular-nums text-muted">{timeOf(item.at)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted">{item.kind === 'content' ? t('calendar.legend.content') : t('calendar.legend.tasks')}</span>
                  </span>
                  {item.kind === 'content' ? (
                    <>
                      <PlatformStack platforms={item.platforms} size="xs" />
                      <StatusBadge kind="content" value={item.status} dot={false} />
                    </>
                  ) : (
                    <StatusBadge kind="task" value={item.status} dot={false} />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
