import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { can, requirePermission } from '@/shared/auth/permissions';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { t } from '@/shared/i18n/t';
import { initials } from '@/shared/lib/format';
import { FilterSelect } from '@/shared/ui/filter-select';
import { param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { clientsById } from '@/features/clients/services/clients.service';
import { addCommentAction } from '@/features/content/actions/content.actions';
import { AGENCY_QUEUE_GROUPS, ApprovalQueue, defaultQueuePost, QueuePostPanel } from '@/features/content/components/planner/approval-queue';
import { toGridTiles } from '@/features/content/components/planner/grid-tiles';
import { PhoneGrid } from '@/features/content/components/planner/phone-grid';
import { OpenPostButton, PlannerDrawerProvider } from '@/features/content/components/planner/planner-drawer';
import { WorkflowActions } from '@/features/content/components/workflow-actions';
import { ContentApprovalPanel } from '@/features/content/components/content-approval-panel';
import { canApproveContentStep, getContentApprovalSummary } from '@/features/content/services/content-approval.service';
import { eventsFor, listContent } from '@/features/content/services/content.service';
import { loadPlanner } from '@/features/content/services/planner.service';
import { listMembers } from '@/features/team/services/members.service';
import { isLiveMode } from '@/shared/config/env';
import { isEditable } from '@/features/content/workflow';

export const metadata: Metadata = { title: t('approvals.title') };

const BASE = '/approvals';

const GUIDE: GuideItem[] = [
  { title: t('approvals.guide.review.title'), body: t('approvals.guide.review.body') },
  { title: t('approvals.guide.fast.title'), body: t('approvals.guide.fast.body') },
];

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePermission(Permissions.APPROVALS_VIEW);
  const sp = await searchParams;
  const clientId = param(sp, 'client');
  const [approver, canCreate] = await Promise.all([
    can(Permissions.APPROVALS_APPROVE),
    can(Permissions.CONTENT_CREATE),
  ]);

  const [all, clients] = await Promise.all([listContent(), clientsById()]);
  const posts = all.filter((p) => p.status !== 'PUBLISHED' && (!clientId || p.clientId === clientId));
  const selected = posts.find((p) => p.id === param(sp, 'post')) ?? defaultQueuePost(AGENCY_QUEUE_GROUPS, posts);
  const selectedClient = selected ? clients.get(selected.clientId) : undefined;
  const [thread, planner, approvalSummary, canApproveStep, members] = await Promise.all([
    selected ? eventsFor(selected.id) : [],
    selectedClient ? loadPlanner(selectedClient.id) : undefined,
    selected ? getContentApprovalSummary(selected.id) : null,
    selected ? canApproveContentStep(selected.id, session.userId) : false,
    listMembers().catch(() => []),
  ]);
  const memberNames = Object.fromEntries(members.map((m) => [m.userId ?? m.id, m.name]));
  const showApproverActions = approver && canApproveStep;
  const hrefs = Object.fromEntries(all.map((p) => [p.id, withQuery(BASE, sp, { post: p.id })]));

  const queue = (
    <ApprovalQueue
      groups={AGENCY_QUEUE_GROUPS}
      posts={posts}
      selectedId={selected?.id}
      hrefs={hrefs}
      backHref={withQuery(BASE, sp, { post: undefined })}
      aside={
        selectedClient && planner ? (
          <PhoneGrid
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            clientInitials={initials(selectedClient.name)}
            tiles={toGridTiles(planner.posts)}
            editable={false}
            tileHrefs={hrefs}
            selectedId={selected?.id}
          />
        ) : null
      }
    >
      {selected ? (
        <QueuePostPanel
          compact
          post={selected}
          thread={thread}
          headerAction={
            isEditable(selected.status) && planner ? (
              <OpenPostButton postId={selected.id} className="nav-link">
                {t('common.edit')}
              </OpenPostButton>
            ) : null
          }
          actions={
            <>
              {approvalSummary ? (
                <ContentApprovalPanel
                  summary={approvalSummary}
                  memberNames={memberNames}
                  canRemind={isLiveMode}
                />
              ) : null}
              <WorkflowActions post={selected} approver={showApproverActions} size="sm" />
            </>
          }
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

  return (
    <div>
      <PageHeader
        title={t('approvals.title')}
        description={approver ? t('approvals.description') : t('approvals.description.creator')}
        eyebrow={<CheckCircle2 className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <FilterSelect
              name="client"
              value={clientId}
              label={t('tasks.filter.client')}
              allLabel={t('tasks.filter.client')}
              options={[...clients.values()].map((c) => ({ value: c.id, label: c.name }))}
            />
          </>
        }
      />
      {planner ? (
        <PlannerDrawerProvider {...planner.drawer} canCreate={canCreate}>
          {queue}
        </PlannerDrawerProvider>
      ) : (
        queue
      )}
    </div>
  );
}
