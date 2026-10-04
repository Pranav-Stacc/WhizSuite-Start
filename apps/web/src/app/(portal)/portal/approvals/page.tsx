import type { Metadata } from 'next';
import { CheckCircle2, PartyPopper } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { dueInfo } from '@/shared/lib/format';
import { Card, CardBody } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { PageHeader } from '@/shared/ui/page-header';
import { PlatformStack } from '@/shared/ui/platform';
import { ClientReviewActions } from '@/features/portal/components/client-review-actions';
import { portalApprovals } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.approvals.title') };

export default async function PortalApprovalsPage() {
  const session = await requireSession();
  const queue = await portalApprovals(session.clientId!);

  return (
    <div>
      <PageHeader title={t('portal.approvals.title')} description={t('portal.approvals.description')} eyebrow={<CheckCircle2 className="inline size-3.5" />} />
      {queue.length === 0 ? (
        <Card>
          <EmptyState icon={<PartyPopper />} title={t('portal.approvals.empty.title')} body={t('portal.approvals.empty.body')} />
        </Card>
      ) : (
        <ul className="space-y-4">
          {queue.map((post) => {
            const due = dueInfo(post.scheduledAt, false);
            return (
              <li key={post.id}>
                <Card>
                  <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold">{post.title}</h2>
                        <p className="mt-1 line-clamp-3 text-[13px] text-muted">{post.caption}</p>
                      </div>
                      <PlatformStack platforms={post.platforms} />
                    </div>
                    {post.scheduledAt ? <p className="text-xs text-muted">{t('portal.approvals.scheduled', { when: due.label })}</p> : null}
                    <ClientReviewActions contentId={post.id} title={post.title} />
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
