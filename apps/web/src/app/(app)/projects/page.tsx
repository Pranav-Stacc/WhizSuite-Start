import type { Metadata } from 'next';
import { FolderKanban, Plus } from 'lucide-react';
import { ProjectStatuses } from '@agency-os/contracts';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_LEADERSHIP, ROLES_STAFF } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { statusLabel } from '@/shared/ui/status';
import { clientsById } from '@/features/clients/services/clients.service';
import { ProjectCard } from '@/features/projects/components/project-card';
import { ProjectDialog } from '@/features/projects/components/project-dialog';
import { listProjectsWithProgress } from '@/features/projects/services/projects.service';
import { membersById } from '@/features/team/services/members.service';

export const metadata: Metadata = { title: t('projects.title') };

const BASE = '/projects';

const GUIDE: GuideItem[] = [
  { title: t('projects.guide.cards.title'), body: t('projects.guide.cards.body') },
  { title: t('projects.guide.new.title'), body: t('projects.guide.new.body') },
];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_STAFF);
  const sp = await searchParams;
  const canManage = ROLES_LEADERSHIP.includes(session.role);
  const status = ProjectStatuses.find((s) => s === param(sp, 'status'));
  const clientId = param(sp, 'client');
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [projects, clients, members] = await Promise.all([listProjectsWithProgress(), clientsById(), membersById()]);

  const scoped = projects.filter((p) => (!clientId || p.clientId === clientId) && (!query || p.name.toLowerCase().includes(query)));
  const visible = scoped.filter((p) => !status || p.status === status);
  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, ...overrides });
  const clientOptions = [...clients.values()].map((c) => ({ id: c.id, name: c.name }));

  return (
    <div>
      <PageHeader
        title={t('projects.title')}
        description={t('projects.description')}
        eyebrow={<FolderKanban className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            {canManage ? (
              <ProjectDialog
                clients={clientOptions}
                defaultOpen={param(sp, 'new') === '1'}
                defaultClientId={clientId}
                trigger={
                  <Button variant="primary">
                    <Plus />
                    {t('projects.new')}
                  </Button>
                }
              />
            ) : null}
          </>
        }
      />

      <div role="search" aria-label={t('projects.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('projects.search')} className="max-w-64" />
        <FilterChips
          items={[
            { href: link({ status: undefined }), label: t('projects.filter.all'), active: !status, count: scoped.length },
            ...ProjectStatuses.map((s) => ({ href: link({ status: s }), label: statusLabel('project', s), active: status === s, count: scoped.filter((p) => p.status === s).length })),
          ]}
        />
        <FilterSelect
          name="client"
          value={clientId}
          label={t('tasks.filter.client')}
          allLabel={t('tasks.filter.client')}
          options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
          className="ml-auto"
        />
      </div>

      {visible.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<FolderKanban />}
            title={t('projects.empty.title')}
            body={t('projects.empty.body')}
            action={
              canManage ? (
                <ProjectDialog
                  clients={clientOptions}
                  trigger={
                    <Button variant="primary">
                      <Plus />
                      {t('projects.new')}
                    </Button>
                  }
                />
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} clientName={clients.get(project.clientId)?.name} clientColor={clients.get(project.clientId)?.color} ownerName={members.get(project.ownerId)?.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
