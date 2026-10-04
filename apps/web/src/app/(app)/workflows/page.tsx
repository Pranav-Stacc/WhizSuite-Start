import type { Metadata } from 'next';
import { Plus, Workflow } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
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
  await requireRole(ROLES_LEADERSHIP);
  const sp = await searchParams;
  const workflows = await listWorkflows();
  const editWorkflow = param(sp, 'edit') ? workflows.find((w) => w.id === param(sp, 'edit')) : undefined;
  const newButton = (
    <Button variant="primary">
      <Plus />
      {t('workflows.new')}
    </Button>
  );

  return (
    <div>
      <PageHeader
        title={t('workflows.title')}
        description={t('workflows.description')}
        eyebrow={<Workflow className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <WorkflowDialog defaultOpen={param(sp, 'new') === '1'} trigger={newButton} />
          </>
        }
      />

      {workflows.length === 0 ? (
        <div className="card-surface">
          <EmptyState icon={<Workflow />} title={t('workflows.empty.title')} body={t('workflows.empty.body')} />
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

      {editWorkflow ? <WorkflowDialog workflow={editWorkflow} defaultOpen /> : null}
    </div>
  );
}
