import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock, MessageCircle, Pencil } from 'lucide-react';
import { getPermissions, loadIf, requirePermission } from '@/shared/auth/permissions';
import { FormDialog } from '@/shared/forms/form-dialog';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { t } from '@/shared/i18n/t';
import { formatDateTime, relativeTime, toDateTimeLocal } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PLATFORM_META } from '@/shared/ui/platform';
import { StatusBadge } from '@/shared/ui/status';
import {
  listClientsForContent,
  stubClientFromPost,
} from '@/features/content/services/content-clients.service';
import { addCommentAction, deleteContentAction, rescheduleContentAction } from '@/features/content/actions/content.actions';
import { ActivityTimeline } from '@/features/content/components/activity-timeline';
import { toComposerAssets, toComposerClients, toComposerPost } from '@/features/content/components/composer-mappers';
import { ContentComposer } from '@/features/content/components/content-composer';
import { ContentApprovalPanel } from '@/features/content/components/content-approval-panel';
import { ContentMediaPreview } from '@/features/content/components/content-media-preview';
import { ShareContentDialog } from '@/features/content/components/share-content-dialog';
import { WorkflowActions } from '@/features/content/components/workflow-actions';
import {
  canApproveContentStep,
  getContentApprovalSummary,
} from '@/features/content/services/content-approval.service';
import { eventsFor, getPost } from '@/features/content/services/content.service';
import { isLiveMode } from '@/shared/config/env';
import { isEditable } from '@/features/content/workflow';
import { DEFAULT_CLIENT_COLOR } from '@/features/clients/config';
import { listAssets } from '@/features/media/services/media.service';
import type { Member } from '@/features/team/data/members.repository';
import { membersById } from '@/features/team/services/members.service';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const post = await getPost((await params).id);
    return { title: post?.title ?? t('content.notFound') };
  } catch {
    return { title: t('content.notFound') };
  }
}

export default async function ContentDetailPage({ params, searchParams }: PageProps) {
  const session = await requirePermission(Permissions.CONTENT_VIEW);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const post = await getPost(id);
  if (!post) notFound();

  const granted = await getPermissions();
  const canReadThread =
    granted.has(Permissions.FEEDBACK_VIEW) || granted.has(Permissions.CONTENT_VIEW);
  const canComment =
    granted.has(Permissions.FEEDBACK_CREATE) || granted.has(Permissions.CONTENT_EDIT);
  const [events, clients, members, assets, approvalSummary, canApproveStep] = await Promise.all([
    canReadThread ? eventsFor(post.id).catch(() => []) : Promise.resolve([]),
    listClientsForContent([post]).catch(() => []),
    loadIf(Permissions.MEMBERS_VIEW, membersById, new Map<string, Member>()).catch(
      () => new Map<string, Member>(),
    ),
    loadIf(Permissions.FILES_VIEW, listAssets, []).catch(() => []),
    post.status === 'IN_REVIEW' ? getContentApprovalSummary(post.id) : Promise.resolve(null),
    post.status === 'IN_REVIEW' ? canApproveContentStep(post.id, session.userId) : Promise.resolve(false),
  ]);
  const client =
    clients.find((c) => c.id === post.clientId) ?? stubClientFromPost(post.clientId);
  const composerClients = toComposerClients(
    clients.some((c) => c.id === post.clientId) ? clients : [...clients, client],
  );
  const author = members.get(post.authorId);
  const approver = granted.has(Permissions.APPROVALS_APPROVE) && canApproveStep;
  const memberNames = Object.fromEntries(
    [...members.values()].map((m) => [m.userId ?? m.id, m.name]),
  );
  const dmMembers = [...members.values()]
    .filter((m) => (m.userId ?? m.id) !== session.userId)
    .map((m) => ({ userId: m.userId ?? m.id, name: m.name }));
  const canShareDm = granted.has(Permissions.CHAT_CREATE_ROOM) && isLiveMode && dmMembers.length > 0;
  const canRemind = granted.has(Permissions.APPROVALS_VIEW) && isLiveMode;
  const editable = isEditable(post.status) && granted.has(Permissions.CONTENT_EDIT);
  const canDelete = granted.has(Permissions.CONTENT_DELETE);
  const previewPlatform = post.platforms.find((p) => p === param(sp, 'platform')) ?? post.platforms[0];
  const base = `/content/${post.id}`;

  return (
    <div className="space-y-8">
      <div>
        <nav aria-label={t('clients.workspace.breadcrumb')} className="mb-6 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted">
          <Link href="/content" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden />
            {t('content.back')}
          </Link>
          {client ? (
            <>
              <span aria-hidden>/</span>
              <Link href={`/clients/${client.id}/grid`} className="hover:text-foreground">
                {client.name}
              </Link>
            </>
          ) : null}
        </nav>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div className="min-w-0">
            <p className="eyebrow">{t(`type.content.${post.contentType}`)}</p>
            <h1 className="display mt-2 flex flex-wrap items-center gap-3 text-[28px] sm:text-[34px]">
              {post.title}
              <StatusBadge kind="content" value={post.status} />
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editable ? (
              <ContentComposer
                key={`${post.id}-${post.version}`}
                clients={composerClients}
                assets={toComposerAssets(assets)}
                post={toComposerPost(post)}
                trigger={
                  <Button variant="outline">
                    <Pencil />
                    {t('common.edit')}
                  </Button>
                }
              />
            ) : null}
            {editable ? (
              <FormDialog
                key={post.scheduledAt ?? 'unscheduled'}
                schema="schedule"
                size="sm"
                title={t('calendar.reschedule')}
                description={t('content.reschedule.desc')}
                submitLabel={t('calendar.reschedule')}
                fields={[{ name: 'scheduledAt', label: t('calendar.field.when'), type: 'datetime-local', required: true, span: 2 }]}
                defaults={{ scheduledAt: post.scheduledAt ? toDateTimeLocal(post.scheduledAt) : '' }}
                action={rescheduleContentAction.bind(null, post.id)}
                trigger={
                  <Button variant="secondary">
                    <CalendarClock />
                    {t('calendar.reschedule')}
                  </Button>
                }
              />
            ) : null}
            {canShareDm ? (
              <ShareContentDialog
                contentId={post.id}
                title={post.title}
                members={dmMembers}
                trigger={
                  <Button variant="outline">
                    <MessageCircle />
                    {t('content.share.dm')}
                  </Button>
                }
              />
            ) : null}
            {canDelete ? <ConfirmButton action={deleteContentAction.bind(null, post.id)} label={t('content.delete')} redirectTo="/content" /> : null}
          </div>
        </header>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section aria-label={t('content.preview.title')} className="space-y-3">
          {post.platforms.length > 1 ? (
            <FilterChips items={post.platforms.map((p) => ({ href: withQuery(base, sp, { platform: p }), label: PLATFORM_META[p].label, active: p === previewPlatform }))} />
          ) : null}
          {previewPlatform ? (
            <ContentMediaPreview
              clientName={client?.name ?? ''}
              clientColor={client?.color ?? DEFAULT_CLIENT_COLOR}
              platform={previewPlatform}
              contentType={post.contentType}
              caption={post.caption}
              hashtags={post.hashtags}
              title={post.title}
              media={post.media}
            />
          ) : null}
        </section>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('content.workflow.title')} description={t(`content.workflow.${post.status}`)} />
            <CardBody className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">{t('content.col.author')}</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    {author ? <Avatar name={author.name} size="xs" /> : null}
                    {author?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('content.col.scheduled')}</dt>
                  <dd className="mt-1">{post.scheduledAt ? formatDateTime(post.scheduledAt) : t('content.unscheduled')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('common.updated')}</dt>
                  <dd className="mt-1">{relativeTime(post.updatedAt)}</dd>
                </div>
                {post.pillar ? (
                  <div>
                    <dt className="text-xs text-muted">{t('content.detail.pillar')}</dt>
                    <dd className="mt-1">{post.pillar}</dd>
                  </div>
                ) : null}
                {post.ctaUrl ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted">{t('content.detail.cta')}</dt>
                    <dd className="mt-1 truncate">
                      <a href={post.ctaUrl} target="_blank" rel="noreferrer noopener" className="underline-offset-4 hover:underline">
                        {post.ctaUrl}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>

              {approvalSummary ? (
                <ContentApprovalPanel
                  summary={approvalSummary}
                  memberNames={memberNames}
                  canRemind={canRemind}
                />
              ) : null}

              <div className="border-t border-border-soft pt-4">
                <WorkflowActions post={post} approver={approver} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('content.activity.title')} description={t('content.activity.desc')} />
            <CardBody className="space-y-5">
              <ActivityTimeline events={events} />
              {canComment ? (
                <InlineMessageForm
                  action={addCommentAction.bind(null, post.id)}
                  label={t('content.comment.label')}
                  placeholder={t('content.comment.placeholder')}
                  submitLabel={t('content.comment.send')}
                />
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
