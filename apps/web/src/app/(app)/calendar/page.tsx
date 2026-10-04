import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { toDateKey } from '@/shared/lib/format';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { ViewToggle, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { Agenda, MonthGrid } from '@/features/calendar/components/calendar-views';
import { listCalendarItems, monthGrid, type CalendarItem } from '@/features/calendar/services/calendar.service';
import { listClients } from '@/features/clients/services/clients.service';

export const metadata: Metadata = { title: t('calendar.title') };

const BASE = '/calendar';
const MONTH_PARAM = /^(\d{4})-(\d{2})$/;
const MONDAY_2024 = new Date(2024, 0, 1);
const DAYS_IN_WEEK = 7;
const MS_PER_DAY = 86_400_000;

const GUIDE: GuideItem[] = [
  { title: t('calendar.guide.click.title'), body: t('calendar.guide.click.body') },
  { title: t('calendar.guide.drag.title'), body: t('calendar.guide.drag.body') },
  { title: t('calendar.guide.filter.title'), body: t('calendar.guide.filter.body') },
];

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function parseMonth(value: string | undefined): { year: number; month: number } {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (match) {
    const month = Number(match[2]) - 1;
    if (month >= 0 && month < 12) return { year: Number(match[1]), month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = toDateKey(item.at);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  return map;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(ROLES_STAFF);
  const sp = await searchParams;
  const { year, month } = parseMonth(param(sp, 'm'));
  const view = param(sp, 'view') === 'agenda' ? 'agenda' : 'month';
  const clientId = param(sp, 'client');

  const [allItems, clients] = await Promise.all([listCalendarItems(), listClients()]);
  const days = monthGrid(year, month);
  const gridStart = days[0].getTime();
  const gridEnd = days[days.length - 1].getTime() + MS_PER_DAY;
  const inRange = (item: CalendarItem): boolean => {
    const d = new Date(item.at);
    if (view === 'agenda') return d.getFullYear() === year && d.getMonth() === month;
    return d.getTime() >= gridStart && d.getTime() < gridEnd;
  };
  const items = allItems.filter((item) => inRange(item) && (!clientId || item.clientId === clientId));
  const itemsByDay = groupByDay(items);

  const monthDate = new Date(year, month, 1);
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const now = new Date();
  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, overrides);
  const weekdayLabels = Array.from({ length: DAYS_IN_WEEK }, (_, i) => new Date(MONDAY_2024.getFullYear(), MONDAY_2024.getMonth(), MONDAY_2024.getDate() + i).toLocaleDateString(undefined, { weekday: 'short' }));

  return (
    <div>
      <PageHeader
        title={t('calendar.title')}
        description={t('calendar.description')}
        eyebrow={<CalendarDays className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <ViewToggle
              items={[
                { href: link({ view: undefined }), label: t('calendar.view.month'), active: view === 'month', icon: <LayoutGrid /> },
                { href: link({ view: 'agenda' }), label: t('calendar.view.agenda'), active: view === 'agenda', icon: <List /> },
              ]}
            />
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1" role="group" aria-label={t('calendar.title')}>
          <Button variant="secondary" size="icon-sm" asChild>
            <Link href={link({ m: monthKey(prev.getFullYear(), prev.getMonth()) })} aria-label={t('calendar.prev')}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="secondary" size="icon-sm" asChild>
            <Link href={link({ m: monthKey(next.getFullYear(), next.getMonth()) })} aria-label={t('calendar.next')}>
              <ChevronRight />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={link({ m: monthKey(now.getFullYear(), now.getMonth()) })}>{t('calendar.today')}</Link>
          </Button>
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <ul className="hidden items-center gap-4 text-xs text-muted sm:flex">
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            {t('calendar.legend.content')}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-info" />
            {t('calendar.legend.tasks')}
          </li>
        </ul>
        <FilterSelect
          name="client"
          value={clientId}
          label={t('calendar.filter.client')}
          allLabel={t('calendar.filter.client')}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          className="ml-auto"
        />
      </div>

      {view === 'month' ? (
        <MonthGrid days={days} month={month} itemsByDay={itemsByDay} weekdayLabels={weekdayLabels} />
      ) : items.length === 0 ? (
        <div className="card-surface">
          <EmptyState icon={<CalendarDays />} title={t('calendar.empty')} />
        </div>
      ) : (
        <Agenda itemsByDay={itemsByDay} />
      )}
    </div>
  );
}
