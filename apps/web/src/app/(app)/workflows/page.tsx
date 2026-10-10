import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { Plus, Workflow } from 'lucide-react';
import { can, loadIf, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { EmptyAction } from '@/shared/ui/empty-action';
import { EmptyState } from '@/shared/ui/feedback';
import { param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { isOwnerRole } from '@/features/roles/config';
import { listRoles, toRoleSummary } from '@/features/roles/services/roles.service';
import { listMembers } from '@/features/team/services/members.service';
import { WorkflowCard } from '@/features/workflows/components/workflow-card';
import { WorkflowDialog } from '@/features/workflows/components/workflow-dialog';
import { listWorkflows } from '@/features/workflows/services/workflows.service';

export const metadata: Metadata = { title: t('workflows.title') };

const BASE = '/workflows';

const GUIDE: GuideItem[] = [
  { title: t('workflows.guide.stages.title'), body: t('workflows.guide.stages.body') },
  { title: t('workflows.guide.client.title'), body: t('workflows.guide.client.body') },
  { title: t('workflows.guide.sla.title'), body: t('workflows.guide.sla.body') },
];

export default async function WorkflowsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission(Permissions.WORKFLOWS_MANAGE);
  const sp = await searchParams;
  const [workflows, roles, members, canManageRoles] = await Promise.all([
    listWorkflows(),
    listRoles().catch(() => []),
    loadIf(Permissions.MEMBERS_VIEW, listMembers, []),
    can(Permissions.ROLES_MANAGE),
  ]);
  const roleSummaries = roles.map(toRoleSummary);
  // Any non-owner role can be attached to a stage — no separate "workflow" role type.
  const workflowRoles = roleSummaries.filter((role) => !isOwnerRole(role));
  const assignableRoles = canManageRoles ? workflowRoles : [];
  const editWorkflow = param(sp, 'edit') ? workflows.find((w) => w.id === param(sp, 'edit')) : undefined;
  const newButton = (
    <Button variant="primary">
      <Plus />
      {t('workflows.new')}
    </Button>
  );

  const dialogProps = {
    workflowRoles,
    members,
    assignableRoles,
  };

  return (
    <div>
      <PageHeader
        title={t('workflows.title')}
        description={t('workflows.description')}
        eyebrow={<Workflow className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <WorkflowDialog {...dialogProps} defaultOpen={param(sp, 'new') === '1'} trigger={newButton} />
          </>
        }
      />

      {workflows.length === 0 ? (
        <div className="card-surface">
          <EmptyState icon={<Workflow />} title={t('workflows.empty.title')} body={t('workflows.empty.body')} action={<EmptyAction filtered={false} clearHref={BASE} createHref={`${BASE}?new=1`} createLabel={t('workflows.new')} />} />
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {workflows.map((workflow) => (
            <li key={workflow.id}>
              <WorkflowCard workflow={workflow} editHref={withQuery(BASE, sp, { new: undefined, edit: workflow.id })} />
            </li>
          ))}
        </ul>
      )}

      {editWorkflow ? <WorkflowDialog {...dialogProps} workflow={editWorkflow} defaultOpen /> : null}
    </div>
  );
}
