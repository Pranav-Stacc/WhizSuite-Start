import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, ImageIcon, Pencil, Plus, Wallet } from 'lucide-react';
import { can, getPermissions, loadIf, requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { dueInfo, formatDate, formatMoney, formatNumber } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { EmptyState, Progress } from '@/shared/ui/feedback';
import { PlatformStack } from '@/shared/ui/platform';
import { StatCard } from '@/shared/ui/stat-card';
import { StatusBadge } from '@/shared/ui/status';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { listClients } from '@/features/clients/services/clients.service';
import { listContent } from '@/features/content/services/content.service';
import { AssetCard } from '@/features/media/components/asset-card';
import { UploadDropzone } from '@/features/media/components/upload-dropzone';
import { listAssets } from '@/features/media/services/media.service';
import { ProjectDialog } from '@/features/projects/components/project-dialog';
import { getProject } from '@/features/projects/services/projects.service';
import { TaskDialog } from '@/features/tasks/components/task-dialog';
import { listTasks } from '@/features/tasks/services/tasks.service';
import type { Member } from '@/features/team/data/members.repository';
import { membersById } from '@/features/team/services/members.service';
import { listEntries } from '@/features/time/services/time.service';

const MINUTES_PER_HOUR = 60;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = await getProject((await params).id);
  return { title: project?.name ?? t('projects.notFound') };
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  await requirePermission(Permissions.PROJECTS_VIEW);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const project = await getProject(id);
  if (!project) notFound();

  const [allClients, tasks, entries, content, members, assets] = await Promise.all([
    loadIf(Permissions.CLIENTS_VIEW, listClients, []),
    loadIf(Permissions.TASKS_VIEW, listTasks, []),
    loadIf(Permissions.TIME_TRACK, listEntries, []),
    loadIf(Permissions.CONTENT_VIEW, listContent, []),
    loadIf(Permissions.MEMBERS_VIEW, membersById, new Map<string, Member>()),
    loadIf(Permissions.FILES_VIEW, listAssets, []),
  ]);
  const client = allClients.find((c) => c.id === project.clientId);
  const projectTasks = tasks.filter((x) => x.projectId === project.id);
  const doneCount = projectTasks.filter((x) => x.status === 'DONE').length;
  const progress = projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0;
  const loggedHours = entries.filter((e) => e.projectId === project.id).reduce((total, e) => total + e.minutes, 0) / MINUTES_PER_HOUR;
  const clientContent = content.filter((c) => c.clientId === project.clientId).slice(0, 5);
  const projectAssets = assets.filter((a) => a.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const canManage = await can(Permissions.PROJECTS_EDIT);
  const granted = await getPermissions();
  const canUploadAssets = isLiveMode && granted.has(Permissions.FILES_UPLOAD);
  const canDeleteAssets = granted.has(Permissions.FILES_DELETE);
  const due = dueInfo(project.endDate, project.status === 'COMPLETED');
  const memberOptions = [...members.values()].filter((m) => m.status !== 'INVITED').map((m) => ({ id: m.id, name: m.name }));
  const projectOption = [{ id: project.id, name: project.name, clientName: client?.name }];
  const owner = members.get(project.ownerId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" />
          {t('projects.back')}
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="size-2.5 rounded-full" style={{ background: client?.color }} />
              {client ? <Link href={`/clients/${client.id}`} className="hover:text-primary">{client.name}</Link> : null}
              <span aria-hidden>·</span>
              {project.type}
            </p>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight sm:text-[28px]">
              {project.name}
              <StatusBadge kind="project" value={project.status} />
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <ProjectDialog
                project={project}
                clients={allClients.map((c) => ({ id: c.id, name: c.name }))}
                trigger={
                  <Button variant="secondary">
                    <Pencil />
                    {t('common.edit')}
                  </Button>
                }
              />
            ) : null}
            <TaskDialog
              projects={projectOption}
              members={memberOptions}
              defaultProjectId={project.id}
              defaultOpen={param(sp, 'new') === '1'}
              trigger={
                <Button variant="primary">
                  <Plus />
                  {t('projects.addTask')}
                </Button>
              }
            />
          </div>
        </header>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('projects.stat.progress')} value={<span>{progress}%</span>} icon={<CheckCircle2 />} hint={t('projects.progress', { done: doneCount, total: projectTasks.length })} />
        <StatCard label={t('projects.stat.logged')} value={t('common.hours', { hours: formatNumber(Math.round(loggedHours * 10) / 10) })} icon={<Clock />} href="/time" />
        <StatCard label={t('projects.stat.budget')} value={<span>{formatMoney(project.budgetMinor, undefined, true)}</span>} icon={<Wallet />} />
        <StatCard
          label={t('projects.timeline')}
          value={<span className="text-xl">{project.endDate ? formatDate(project.endDate) : t('projects.noEnd')}</span>}
          icon={<CalendarDays />}
          hint={project.endDate ? due.label : undefined}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('projects.tasks')} description={t('projects.progress', { done: doneCount, total: projectTasks.length })} />
          <CardBody>
            <Progress value={progress} className="mb-4" />
            {projectTasks.length === 0 ? (
              <EmptyState title={t('projects.tasks.empty')} />
            ) : (
              <ul className="divide-y divide-border-soft">
                {projectTasks.map((task) => {
                  const assignee = task.assigneeId ? members.get(task.assigneeId)?.name : undefined;
                  const taskDue = dueInfo(task.dueDate, task.status === 'DONE');
                  return (
                    <li key={task.id}>
                      <Link href={`/tasks?edit=${task.id}`} className="flex items-center gap-3 py-3 transition-colors hover:text-primary">
                        <StatusBadge kind="task" value={task.status} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
                        {task.dueDate ? <Badge tone={taskDue.tone === 'danger' ? 'danger' : taskDue.tone === 'warning' ? 'warning' : 'neutral'}>{taskDue.label}</Badge> : null}
                        {assignee ? <Avatar name={assignee} size="xs" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          {owner ? (
            <Card>
              <CardHeader title={t('projects.owner')} />
              <CardBody className="flex items-center gap-3">
                <Avatar name={owner.name} size="md" />
                <div>
                  <p className="text-sm font-medium">{owner.name}</p>
                  <p className="text-xs text-muted">{owner.title}</p>
                </div>
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title={t('projects.content.title')} />
            <CardBody className="pt-3">
              {clientContent.length === 0 ? (
                <p className="text-sm text-muted">{t('projects.content.empty')}</p>
              ) : (
                <ul className="space-y-3">
                  {clientContent.map((post) => (
                    <li key={post.id}>
                      <Link href={`/content/${post.id}`} className="flex items-center gap-3 text-sm hover:text-primary">
                        <span className="min-w-0 flex-1 truncate">{post.title}</span>
                        <PlatformStack platforms={post.platforms} size="xs" />
                        <StatusBadge kind="content" value={post.status} dot={false} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </section>

      {granted.has(Permissions.FILES_VIEW) ? (
        <Card>
          <CardHeader
            title={t('projects.assets.title')}
            action={
              client ? (
                <Link href={`/clients/${client.id}/assets`} className="text-sm text-primary hover:underline">
                  {t('projects.assets.library')}
                </Link>
              ) : null
            }
          />
          <CardBody className="space-y-4">
            {client && canUploadAssets ? (
              <UploadDropzone clientId={client.id} projectId={project.id} enabled={canUploadAssets} />
            ) : null}
            {projectAssets.length === 0 ? (
              <EmptyState icon={<ImageIcon />} title={t('projects.assets.empty')} />
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {projectAssets.map((asset) => (
                  <li key={asset.id}>
                    <AssetCard asset={asset} canDelete={canDeleteAssets} canDownload={isLiveMode} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
