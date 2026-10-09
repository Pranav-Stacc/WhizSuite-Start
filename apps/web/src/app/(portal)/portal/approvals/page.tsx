import type { Metadata } from 'next';
import { CheckCircle2, PartyPopper } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { t } from '@/shared/i18n/t';
import { initials } from '@/shared/lib/format';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageHeader } from '@/shared/ui/page-header';
import { ApprovalQueue, defaultQueuePost, PORTAL_QUEUE_GROUPS, QueuePostPanel } from '@/features/content/components/planner/approval-queue';
import { toGridTiles } from '@/features/content/components/planner/grid-tiles';
import { PhoneGrid } from '@/features/content/components/planner/phone-grid';
import { ReviewActions } from '@/features/content/components/review-actions';
import { eventsFor } from '@/features/content/services/content.service';
import { clientCommentContentAction, clientDecideContentAction } from '@/features/portal/actions/portal.actions';
import { portalClient, portalContent } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.approvals.title') };

const BASE = '/portal/approvals';

export default async function PortalApprovalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireSession();
  const clientId = session.clientId ?? '';
  const sp = await searchParams;
  const [posts, client] = await Promise.all([portalContent(clientId), portalClient(clientId)]);
  const selected = posts.find((p) => p.id === param(sp, 'post')) ?? defaultQueuePost(PORTAL_QUEUE_GROUPS, posts);
  const thread = selected ? await eventsFor(selected.id) : [];
  const hrefs = Object.fromEntries(posts.map((p) => [p.id, withQuery(BASE, sp, { post: p.id })]));

  return (
    <div>
      <PageHeader title={t('portal.approvals.title')} description={t('portal.approvals.description')} eyebrow={<CheckCircle2 className="inline size-3.5" />} />
      {posts.length === 0 ? (
        <Card>
          <EmptyState icon={<PartyPopper />} title={t('portal.approvals.empty.title')} body={t('portal.approvals.empty.body')} />
        </Card>
      ) : (
        <ApprovalQueue
          groups={PORTAL_QUEUE_GROUPS}
          posts={posts}
          selectedId={selected?.id}
          hrefs={hrefs}
          aside={
            client ? (
              <PhoneGrid clientId={client.id} clientName={client.name} clientInitials={initials(client.name)} tiles={toGridTiles(posts)} editable={false} tileHrefs={hrefs} selectedId={selected?.id} />
            ) : null
          }
        >
          {selected ? (
            <QueuePostPanel
              post={selected}
              thread={thread}
              actions={
                selected.status === 'IN_REVIEW' ? (
                  <ReviewActions contentId={selected.id} title={selected.title} size="sm" decide={clientDecideContentAction} />
                ) : (
                  <p className="text-[12px] text-muted">{t('portal.approvals.decided')}</p>
                )
              }
              composer={
                <InlineMessageForm
                  key={selected.id}
                  action={clientCommentContentAction.bind(null, selected.id)}
                  label={t('content.comment.label')}
                  placeholder={t('content.comment.placeholder')}
                  submitLabel={t('content.comment.send')}
                />
              }
            />
          ) : null}
        </ApprovalQueue>
      )}
    </div>
  );
}
