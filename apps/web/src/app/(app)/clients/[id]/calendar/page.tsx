import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContentStatus } from '@agency-os/contracts';
import { requireRole } from '@/shared/auth/session';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { t } from '@/shared/i18n/t';
import { initials, toDateKey } from '@/shared/lib/format';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { SectionHeading } from '@/shared/ui/section-heading';
import { MonthGrid } from '@/features/calendar/components/calendar-views';
import { contentCalendarItem, groupByDay, isScheduled, monthGrid } from '@/features/calendar/services/calendar.service';
import { daysInMonth, monthKey, monthTitle, parseMonth, shiftMonth, weekdayLabels, type MonthRef } from '@/features/calendar/utils/month';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { addCommentAction } from '@/features/content/actions/content.actions';
import { AGENCY_QUEUE_GROUPS, ApprovalQueue, defaultQueuePost, QueuePostPanel } from '@/features/content/components/planner/approval-queue';
import { ContentSheet, type SheetColumn } from '@/features/content/components/planner/content-sheet';
import { toGridTiles } from '@/features/content/components/planner/grid-tiles';
import { PhoneGrid } from '@/features/content/components/planner/phone-grid';
import { OpenPostButton, PlannerDrawerProvider } from '@/features/content/components/planner/planner-drawer';
import { WorkflowActions } from '@/features/content/components/workflow-actions';
import type { Post } from '@/features/content/data/content.repository';
import { eventsFor, eventsForMany } from '@/features/content/services/content.service';
import { loadPlanner } from '@/features/content/services/planner.service';
import { canApprove, isEditable } from '@/features/content/workflow';

export const metadata = { title: t('clients.workspace.calendar') };

const VIEWS = ['sheet', 'month', 'queue'] as const;
type View = (typeof VIEWS)[number];

const STATUS_FILTERS = {
  all: undefined,
  review: ['IN_REVIEW'],
  approved: ['APPROVED', 'SCHEDULED', 'PUBLISHED'],
  changes: ['CHANGES_REQUESTED'],
  draft: ['DRAFT'],
} as const satisfies Record<string, readonly ContentStatus[] | undefined>;
type StatusFilter = keyof typeof STATUS_FILTERS;

function inMonth(post: Post, ref: MonthRef): boolean {
  if (!post.scheduledAt) return false;
  const d = new Date(post.scheduledAt);
  return d.getFullYear() === ref.year && d.getMonth() === ref.month;
}

function sheetColumns(posts: Post[], ref: MonthRef, hideEmpty: boolean, notes: Map<string, string>): SheetColumn[] {
  const byDay = groupByDay(posts.filter(isScheduled).map((p) => ({ at: p.scheduledAt, post: p })));
  const columns: SheetColumn[] = [];
  for (const day of daysInMonth(ref)) {
    const key = toDateKey(day);
    const entries = byDay.get(key);
    if (entries) for (const { post } of entries) columns.push({ key: post.id, day, post, note: notes.get(post.id) });
    else if (!hideEmpty) columns.push({ key, day });
  }
  return columns;
}

export default async function ClientCalendarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_STAFF);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const client = await getClient(id);
  if (!client) notFound();

  const base = `/clients/${client.id}/calendar`;
  const view: View = VIEWS.find((v) => v === param(sp, 'view')) ?? 'sheet';
  const filter: StatusFilter = (Object.keys(STATUS_FILTERS) as StatusFilter[]).find((f) => f === param(sp, 's')) ?? 'all';
  const hideEmpty = param(sp, 'empty') === 'hide';
  const ref = parseMonth(param(sp, 'm'));
  const link = (overrides: Record<string, string | undefined>) => withQuery(base, sp, overrides);

  const planner = await loadPlanner(client.id);
  const statuses: readonly ContentStatus[] | undefined = STATUS_FILTERS[filter];
  const filtered = planner.posts.filter((p) => !statuses || statuses.includes(p.status));
  const monthPosts = filtered.filter((p) => inMonth(p, ref));
  const prev = shiftMonth(ref, -1);
  const next = shiftMonth(ref, 1);
  const approver = canApprove(session.role);

  const viewNav = (
    <nav aria-label={t('sheet.views')} className="flex items-center gap-5">
      {VIEWS.map((v) => (
        <Link key={v} href={link({ view: v === 'sheet' ? undefined : v, post: undefined })} aria-current={v === view ? 'page' : undefined} className="nav-link">
          {t(`sheet.view.${v}`)}
        </Link>
      ))}
    </nav>
  );

  let body: ReactNode;
  if (view === 'queue') {
    const selected = planner.posts.find((p) => p.id === param(sp, 'post')) ?? defaultQueuePost(AGENCY_QUEUE_GROUPS, planner.posts);
    const thread = selected ? await eventsFor(selected.id) : [];
    const hrefs = Object.fromEntries(planner.posts.map((p) => [p.id, link({ post: p.id })]));
    body = (
      <ApprovalQueue
        groups={AGENCY_QUEUE_GROUPS}
        posts={planner.posts}
        selectedId={selected?.id}
        hrefs={hrefs}
        aside={<PhoneGrid clientId={client.id} clientName={client.name} clientInitials={initials(client.name)} tiles={toGridTiles(planner.posts)} editable={false} tileHrefs={hrefs} selectedId={selected?.id} />}
      >
        {selected ? (
          <QueuePostPanel
            post={selected}
            thread={thread}
            headerAction={
              isEditable(selected.status) ? (
                <OpenPostButton postId={selected.id} className="nav-link">
                  {t('common.edit')}
                </OpenPostButton>
              ) : null
            }
            actions={<WorkflowActions post={selected} approver={approver} size="sm" />}
            composer={
              <InlineMessageForm
                key={selected.id}
                action={addCommentAction.bind(null, selected.id)}
                label={t('content.comment.label')}
                placeholder={t('content.comment.placeholder')}
                submitLabel={t('content.comment.send')}
              />
            }
          />
        ) : null}
      </ApprovalQueue>
    );
  } else if (view === 'month') {
    const items = monthPosts.filter(isScheduled).map((p) => contentCalendarItem(p, client.color));
    body = <MonthGrid days={monthGrid(ref.year, ref.month)} month={ref.month} itemsByDay={groupByDay(items)} weekdayLabels={weekdayLabels()} />;
  } else {
    const threads = await eventsForMany(monthPosts.map((p) => p.id));
    const notes = new Map([...threads].flatMap(([postId, events]) => (events.length ? [[postId, events[events.length - 1].body] as const] : [])));
    body = <ContentSheet columns={sheetColumns(monthPosts, ref, hideEmpty, notes)} />;
  }

  return (
    <PlannerDrawerProvider {...planner.drawer}>
      <section>
        <SectionHeading number={clientSectionNumber('calendar')} title={t('clients.workspace.calendar')}>
          {viewNav}
        </SectionHeading>

        {view !== 'queue' ? (
          <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3">
              <Link href={link({ m: monthKey(prev.year, prev.month) })} aria-label={t('calendar.prev')} className="p-1 text-muted hover:text-foreground">
                <ChevronLeft className="size-4" />
              </Link>
              <h3 className="display min-w-40 text-center text-[22px]">{monthTitle(ref)}</h3>
              <Link href={link({ m: monthKey(next.year, next.month) })} aria-label={t('calendar.next')} className="p-1 text-muted hover:text-foreground">
                <ChevronRight className="size-4" />
              </Link>
            </div>
            <FilterChips
              items={(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((f) => ({
                href: link({ s: f === 'all' ? undefined : f }),
                label: t(`sheet.filter.${f}`),
                active: f === filter,
              }))}
            />
            {view === 'sheet' ? (
              <Link href={link({ empty: hideEmpty ? undefined : 'hide' })} className="nav-link ml-auto" aria-pressed={hideEmpty}>
                {hideEmpty ? t('sheet.showEmpty') : t('sheet.hideEmpty')}
              </Link>
            ) : null}
          </div>
        ) : null}

        {body}
      </section>
    </PlannerDrawerProvider>
  );
}
