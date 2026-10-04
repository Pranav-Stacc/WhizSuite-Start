import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, PartyPopper } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { dueInfo, relativeTime } from '@/shared/lib/format';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { PlatformStack } from '@/shared/ui/platform';
import { clientsById } from '@/features/clients/services/clients.service';
import { ActivityTimeline } from '@/features/content/components/activity-timeline';
import { ReviewActions } from '@/features/content/components/review-actions';
import { allEvents, pendingApprovals } from '@/features/content/services/content.service';
import { canApprove } from '@/features/content/workflow';
import { membersById } from '@/features/team/services/members.service';

export const metadata: Metadata = { title: t('approvals.title') };

const RECENT_DECISIONS_LIMIT = 5;
const DECISION_KINDS = ['approved', 'changes', 'rejected'];

const GUIDE: GuideItem[] = [
  { title: t('approvals.guide.review.title'), body: t('approvals.guide.review.body') },
  { title: t('approvals.guide.fast.title'), body: t('approvals.guide.fast.body') },
];

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_STAFF);
  const sp = await searchParams;
  const clientId = param(sp, 'client');
  const approver = canApprove(session.role);

  const [pending, events, clients, members] = await Promise.all([pendingApprovals(), allEvents(), clientsById(), membersById()]);
  const queue = pending.filter((p) => !clientId || p.clientId === clientId).sort((a, b) => (a.scheduledAt ?? '9').localeCompare(b.scheduledAt ?? '9'));
  const decisions = events
    .filter((e) => DECISION_KINDS.includes(e.kind))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, RECENT_DECISIONS_LIMIT);

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

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label={t('approvals.queue')} className="space-y-4">
          {queue.length === 0 ? (
            <Card>
              <EmptyState icon={<PartyPopper />} title={t('approvals.empty.title')} body={t('approvals.empty.body')} />
            </Card>
          ) : (
            queue.map((post) => {
              const client = clients.get(post.clientId);
              const author = members.get(post.authorId);
              const due = dueInfo(post.scheduledAt, false);
              return (
                <Card key={post.id}>
                  <CardBody className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs text-muted">
                          <span className="size-2 rounded-full" style={{ background: client?.color }} />
                          {client?.name}
                          <span aria-hidden>·</span>
                          {t(`type.content.${post.contentType}`)}
                        </p>
                        <h2 className="mt-1 text-base font-semibold">
                          <Link href={`/content/${post.id}`} className="hover:text-primary">
                            {post.title}
                          </Link>
                        </h2>
                      </div>
                      <PlatformStack platforms={post.platforms} />
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted">{post.caption}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      {author ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={author.name} size="xs" />
                          {author.name}
                        </span>
                      ) : null}
                      <span>{relativeTime(post.updatedAt)}</span>
                      {post.scheduledAt ? <Badge tone={due.tone === 'danger' ? 'danger' : due.tone === 'warning' ? 'warning' : 'neutral'}>{t('approvals.goesLive', { when: due.label })}</Badge> : null}
                    </div>
                    <div className="border-t border-border-soft pt-4">
                      {approver ? <ReviewActions contentId={post.id} title={post.title} size="sm" /> : <p className="text-sm text-muted">{t('content.waiting')}</p>}
                    </div>
                  </CardBody>
                </Card>
              );
            })
          )}
        </section>

        <Card className="h-fit">
          <CardHeader title={t('approvals.recent')} description={t('approvals.recent.desc')} />
          <CardBody>
            <ActivityTimeline events={decisions} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
