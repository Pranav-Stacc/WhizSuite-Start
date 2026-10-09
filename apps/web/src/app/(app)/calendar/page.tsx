import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { ViewToggle, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { Agenda, MonthGrid } from '@/features/calendar/components/calendar-views';
import { groupByDay, listCalendarItems, monthGrid, type CalendarItem } from '@/features/calendar/services/calendar.service';
import { monthKey, monthTitle, parseMonth, shiftMonth, weekdayLabels } from '@/features/calendar/utils/month';
import { listClients } from '@/features/clients/services/clients.service';

export const metadata: Metadata = { title: t('calendar.title') };

const BASE = '/calendar';
const MS_PER_DAY = 86_400_000;

const GUIDE: GuideItem[] = [
  { title: t('calendar.guide.click.title'), body: t('calendar.guide.click.body') },
  { title: t('calendar.guide.drag.title'), body: t('calendar.guide.drag.body') },
  { title: t('calendar.guide.filter.title'), body: t('calendar.guide.filter.body') },
];

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

  const prev = shiftMonth({ year, month }, -1);
  const next = shiftMonth({ year, month }, 1);
  const now = new Date();
  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, overrides);

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
            <Link href={link({ m: monthKey(prev.year, prev.month) })} aria-label={t('calendar.prev')}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="secondary" size="icon-sm" asChild>
            <Link href={link({ m: monthKey(next.year, next.month) })} aria-label={t('calendar.next')}>
              <ChevronRight />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={link({ m: monthKey(now.getFullYear(), now.getMonth()) })}>{t('calendar.today')}</Link>
          </Button>
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{monthTitle({ year, month })}</h2>
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
        <MonthGrid days={days} month={month} itemsByDay={itemsByDay} weekdayLabels={weekdayLabels()} />
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
