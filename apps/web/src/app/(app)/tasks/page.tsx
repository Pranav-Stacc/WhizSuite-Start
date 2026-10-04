import type { Metadata } from 'next';
import Link from 'next/link';
import { KanbanSquare, List, ListChecks, Plus } from 'lucide-react';
import { TaskStatuses } from '@agency-os/contracts';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { FilterChips, ViewToggle, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { Kanban } from '@/shared/ui/kanban';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { clientsById } from '@/features/clients/services/clients.service';
import { listProjects } from '@/features/projects/services/projects.service';
import { membersById } from '@/features/team/services/members.service';
import { moveTaskAction } from '@/features/tasks/actions/task.actions';
import { TaskCardContent } from '@/features/tasks/components/task-card';
import { TaskDialog } from '@/features/tasks/components/task-dialog';
import { TaskList } from '@/features/tasks/components/task-list';
import { isOverdue, listTasks } from '@/features/tasks/services/tasks.service';

export const metadata: Metadata = { title: t('tasks.title') };

const BASE = '/tasks';
const FILTERS = ['all', 'mine', 'unassigned', 'overdue'] as const;
type TaskFilter = (typeof FILTERS)[number];

const GUIDE: GuideItem[] = [
  { title: t('tasks.guide.drag.title'), body: t('tasks.guide.drag.body') },
  { title: t('tasks.guide.filter.title'), body: t('tasks.guide.filter.body') },
  { title: t('tasks.guide.open.title'), body: t('tasks.guide.open.body') },
  { title: t('tasks.guide.create.title'), body: t('tasks.guide.create.body') },
];

function parseFilter(value: string | undefined): TaskFilter {
  return FILTERS.find((f) => f === value) ?? 'all';
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_STAFF);
  const sp = await searchParams;
  const view = param(sp, 'view') === 'list' ? 'list' : 'board';
  const filter = parseFilter(param(sp, 'f'));
  const clientId = param(sp, 'client');
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [allTasks, projects, clients, members] = await Promise.all([listTasks(), listProjects(), clientsById(), membersById()]);

  const matchesScope = (task: (typeof allTasks)[number]): boolean => {
    if (clientId && task.clientId !== clientId) return false;
    if (query && !task.title.toLowerCase().includes(query)) return false;
    return true;
  };
  const scoped = allTasks.filter(matchesScope);
  const predicates: Record<TaskFilter, (task: (typeof allTasks)[number]) => boolean> = {
    all: () => true,
    mine: (task) => task.assigneeId === session.userId,
    unassigned: (task) => !task.assigneeId,
    overdue: (task) => isOverdue(task),
  };
  const tasks = scoped.filter(predicates[filter]);

  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, edit: undefined, ...overrides });
  const editTask = param(sp, 'edit') ? allTasks.find((task) => task.id === param(sp, 'edit')) : undefined;
  const hasFilters = filter !== 'all' || Boolean(clientId) || Boolean(query);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name, clientName: clients.get(p.clientId)?.name }));
  const memberOptions = [...members.values()].filter((m) => m.status !== 'INVITED').map((m) => ({ id: m.id, name: m.name }));
  const clientName = (id: string) => clients.get(id)?.name;
  const clientColor = (id: string) => clients.get(id)?.color;
  const assigneeName = (id: string | undefined) => (id ? members.get(id)?.name : undefined);

  const filterLabels: Record<TaskFilter, string> = {
    all: t('tasks.filter.all'),
    mine: t('tasks.filter.mine'),
    unassigned: t('tasks.filter.unassigned'),
    overdue: t('tasks.filter.overdue'),
  };

  const columns = TaskStatuses.map((status) => {
    const inColumn = tasks.filter((task) => task.status === status);
    const hours = inColumn.reduce((total, task) => total + task.estimateHours, 0);
    return {
      id: status,
      title: statusLabel('task', status),
      color: TONE_COLOR[statusTone('task', status)],
      summary: t('tasks.col.total', { count: inColumn.length, hours }),
    };
  });

  return (
    <div>
      <PageHeader
        title={t('tasks.title')}
        description={t('tasks.description')}
        eyebrow={<ListChecks className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <ViewToggle
              items={[
                { href: link({ view: undefined }), label: t('tasks.view.board'), active: view === 'board', icon: <KanbanSquare /> },
                { href: link({ view: 'list' }), label: t('tasks.view.list'), active: view === 'list', icon: <List /> },
              ]}
            />
            <TaskDialog
              projects={projectOptions}
              members={memberOptions}
              defaultOpen={param(sp, 'new') === '1'}
              trigger={
                <Button variant="primary">
                  <Plus />
                  {t('tasks.new')}
                </Button>
              }
            />
          </>
        }
      />

      <div role="search" aria-label={t('tasks.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('tasks.search')} className="max-w-64" />
        <FilterChips
          items={FILTERS.map((f) => ({
            href: link({ f: f === 'all' ? undefined : f }),
            label: filterLabels[f],
            active: filter === f,
            count: scoped.filter(predicates[f]).length,
          }))}
        />
        <FilterSelect
          name="client"
          value={clientId}
          label={t('tasks.filter.client')}
          allLabel={t('tasks.filter.client')}
          options={[...clients.values()].map((c) => ({ value: c.id, label: c.name }))}
          className="ml-auto"
        />
      </div>

      {tasks.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<ListChecks />}
            title={t('tasks.empty.title')}
            body={t('tasks.empty.body')}
            action={
              hasFilters ? (
                <Button variant="secondary" asChild>
                  <Link href={BASE}>{t('common.clearFilters')}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : view === 'board' ? (
        <Kanban
          columns={columns}
          cards={tasks.map((task) => ({
            id: task.id,
            columnId: task.status,
            href: link({ edit: task.id }),
            content: <TaskCardContent task={task} clientName={clientName(task.clientId)} clientColor={clientColor(task.clientId)} assigneeName={assigneeName(task.assigneeId)} />,
          }))}
          moveAction={moveTaskAction}
        />
      ) : (
        <TaskList tasks={tasks} clientName={clientName} clientColor={clientColor} assigneeName={assigneeName} editHref={(id) => link({ edit: id })} />
      )}

      {editTask ? <TaskDialog projects={projectOptions} members={memberOptions} task={editTask} defaultOpen /> : null}
    </div>
  );
}
