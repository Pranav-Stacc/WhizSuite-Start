import { Permissions, Platforms, type Platform } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, Plus } from 'lucide-react';
import { getPermissions, loadIf, loadIfAny, requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { FilterChips, ViewToggle, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { PLATFORM_META } from '@/shared/ui/platform';
import { Agenda, MonthGrid } from '@/features/calendar/components/calendar-views';
import { DayPanel } from '@/features/calendar/components/day-panel';
import { CalendarItemHost } from '@/features/calendar/components/calendar-item-host';
import { PlanShootDialog } from '@/features/calendar/components/plan-shoot-dialog';
import { groupByDay, listCalendarItems, monthGrid, type CalendarItem } from '@/features/calendar/services/calendar.service';
import { getGoogleCalendarConnection } from '@/features/calendar/services/google-calendar.service';
import { monthKey, monthTitle, parseMonth, shiftMonth, weekdayLabels } from '@/features/calendar/utils/month';
import { listClientsForContent } from '@/features/content/services/content-clients.service';
import { listProjects } from '@/features/projects/services/projects.service';

export const metadata: Metadata = { title: t('calendar.title') };

const BASE = '/calendar';
const MS_PER_DAY = 86_400_000;
const DAY_PARAM = /^\d{4}-\d{2}-\d{2}$/;

const GUIDE: GuideItem[] = [
  { title: t('calendar.guide.click.title'), body: t('calendar.guide.click.body') },
  { title: t('calendar.guide.drag.title'), body: t('calendar.guide.drag.body') },
  { title: t('calendar.guide.filter.title'), body: t('calendar.guide.filter.body') },
];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission(Permissions.CALENDAR_VIEW);
  const sp = await searchParams;
  const { year, month } = parseMonth(param(sp, 'm'));
  const view = param(sp, 'view') === 'agenda' ? 'agenda' : 'month';
  const clientId = param(sp, 'client');
  const platform = Platforms.find((p) => p === param(sp, 'platform')) as Platform | undefined;
  const dayParam = param(sp, 'day');
  const selectedDay = dayParam && DAY_PARAM.test(dayParam) ? dayParam : undefined;
  const granted = await getPermissions();
  const canPlanShoot = granted.has(Permissions.PROJECTS_CREATE) && isLiveMode;
  const canCreatePost = granted.has(Permissions.CONTENT_CREATE);
  const canCreateEvent = granted.has(Permissions.CALENDAR_CREATE) && isLiveMode;
  const days = monthGrid(year, month);
  const gridStart = days[0];
  const gridEnd = new Date(days[days.length - 1].getTime() + MS_PER_DAY);
  const rangeFrom = gridStart.toISOString();
  const rangeTo = gridEnd.toISOString();

  const itemId = param(sp, 'item');
  const [allItems, clients, projects, googleConnection] = await Promise.all([
    listCalendarItems({ from: rangeFrom, to: rangeTo, clientId }).catch(() => []),
    loadIfAny([Permissions.CLIENTS_VIEW, Permissions.CONTENT_VIEW], () => listClientsForContent(), []).catch(
      () => [],
    ),
    canPlanShoot || canCreateEvent
      ? loadIf(Permissions.PROJECTS_VIEW, listProjects, []).catch(() => [])
      : Promise.resolve([]),
    getGoogleCalendarConnection().catch(() => null),
  ]);

  const inRange = (item: CalendarItem): boolean => {
    const d = new Date(item.at);
    if (view === 'agenda') return d.getFullYear() === year && d.getMonth() === month;
    return d.getTime() >= gridStart.getTime() && d.getTime() < gridEnd.getTime();
  };
  const matchesPlatform = (item: CalendarItem): boolean => {
    if (!platform) return true;
    if (item.kind !== 'content') return true;
    return item.platforms?.includes(platform) ?? false;
  };
  const items = allItems.filter((item) => inRange(item) && (!clientId || item.clientId === clientId) && matchesPlatform(item));
  const itemsByDay = groupByDay(items);

  const prev = shiftMonth({ year, month }, -1);
  const next = shiftMonth({ year, month }, 1);
  const now = new Date();
  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, overrides);
  const googleConnected = googleConnection?.status === 'CONNECTED';
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name, clientId: p.clientId }));

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
            {canPlanShoot ? (
              <PlanShootDialog
                clients={clientOptions}
                projects={projectOptions}
                defaultClientId={clientId}
                googleConnected={googleConnected}
                defaultSyncToGoogle={googleConnection?.defaultSyncNewEvents ?? false}
                trigger={
                  <Button variant="secondary">
                    <Plus />
                    {t('calendar.shoot.open')}
                  </Button>
                }
              />
            ) : null}
            {canCreatePost ? (
              <Button variant="primary" asChild>
                <Link href={clientId ? `/content?new=1&client=${clientId}` : '/content?new=1'}>
                  <Plus />
                  {t('content.new')}
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1" role="group" aria-label={t('calendar.title')}>
          <Button variant="secondary" size="icon-sm" asChild>
            <Link href={link({ m: monthKey(prev.year, prev.month), day: undefined })} aria-label={t('calendar.prev')}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="secondary" size="icon-sm" asChild>
            <Link href={link({ m: monthKey(next.year, next.month), day: undefined })} aria-label={t('calendar.next')}>
              <ChevronRight />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={link({ m: monthKey(now.getFullYear(), now.getMonth()), day: undefined })}>{t('calendar.today')}</Link>
          </Button>
        </div>
        <h2 className="min-w-0 flex-1 text-base font-semibold tracking-tight sm:text-lg">{monthTitle({ year, month })}</h2>
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted sm:text-xs">
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            {t('calendar.legend.content')}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-info" />
            {t('calendar.legend.tasks')}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-warning" />
            {t('calendar.legend.shoots')}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-violet" />
            {t('calendar.legend.approvals')}
          </li>
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <FilterSelect
            name="client"
            value={clientId}
            label={t('calendar.filter.client')}
            allLabel={t('calendar.filter.client')}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            className="w-full sm:w-auto"
          />
          <FilterChips
            className="w-full sm:w-auto"
            items={[
              { href: link({ platform: undefined }), label: t('calendar.filter.platformAll'), active: !platform },
              ...Platforms.map((p) => ({
                href: link({ platform: p }),
                label: PLATFORM_META[p].label,
                active: platform === p,
              })),
            ]}
          />
        </div>
      </div>

      {view === 'month' ? (
        <>
          {items.length === 0 ? <p className="mb-3 text-[13px] text-muted">{t('calendar.month.empty')}</p> : null}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="min-w-[36rem] sm:min-w-0">
              <MonthGrid
                days={days}
                month={month}
                itemsByDay={itemsByDay}
                weekdayLabels={weekdayLabels()}
                selectedDay={selectedDay}
                dayHref={(key) => link({ day: key })}
              />
            </div>
          </div>
        </>
      ) : items.length === 0 ? (
        <div className="card-surface">
          <EmptyState icon={<CalendarDays />} title={t('calendar.empty')} />
        </div>
      ) : (
        <Agenda itemsByDay={itemsByDay} />
      )}

      <CalendarItemHost items={items} itemId={itemId} />

      {selectedDay ? (
        <DayPanel
          day={selectedDay}
          items={itemsByDay.get(selectedDay) ?? []}
          closeHref={link({ day: undefined })}
          clientId={clientId}
          canCreatePost={canCreatePost}
          canCreateEvent={canCreateEvent}
          canPlanShoot={canPlanShoot}
          googleConnected={googleConnected}
          defaultSyncToGoogle={googleConnection?.defaultSyncNewEvents ?? false}
          clients={clientOptions}
          projects={projectOptions}
        />
      ) : null}
    </div>
  );
}
