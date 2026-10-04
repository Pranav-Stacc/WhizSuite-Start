import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock, CalendarPlus, Pencil, Rocket, Send, Undo2 } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { FormDialog } from '@/shared/forms/form-dialog';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { t } from '@/shared/i18n/t';
import { formatDateTime, relativeTime, toDateTimeLocal } from '@/shared/lib/format';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { ActionButton } from '@/shared/ui/action-button';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PLATFORM_META } from '@/shared/ui/platform';
import { StatusBadge } from '@/shared/ui/status';
import { listClients } from '@/features/clients/services/clients.service';
import { addCommentAction, deleteContentAction, moveContentAction, rescheduleContentAction } from '@/features/content/actions/content.actions';
import { ActivityTimeline } from '@/features/content/components/activity-timeline';
import { toComposerClients, toComposerPost } from '@/features/content/components/composer-mappers';
import { ContentComposer } from '@/features/content/components/content-composer';
import { PostPreview } from '@/features/content/components/post-preview';
import { ReviewActions } from '@/features/content/components/review-actions';
import { eventsFor, getPost } from '@/features/content/services/content.service';
import { canApprove, isEditable } from '@/features/content/workflow';
import { membersById } from '@/features/team/services/members.service';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPost((await params).id);
  return { title: post?.title ?? t('content.notFound') };
}

export default async function ContentDetailPage({ params, searchParams }: PageProps) {
  const session = await requireRole(ROLES_STAFF);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const post = await getPost(id);
  if (!post) notFound();

  const [events, clients, members] = await Promise.all([eventsFor(post.id), listClients(), membersById()]);
  const client = clients.find((c) => c.id === post.clientId);
  const author = members.get(post.authorId);
  const approver = canApprove(session.role);
  const editable = isEditable(post.status);
  const previewPlatform = post.platforms.find((p) => p === param(sp, 'platform')) ?? post.platforms[0];
  const base = `/content/${post.id}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/content" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" />
          {t('content.back')}
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="size-2.5 rounded-full" style={{ background: client?.color }} />
              {client ? (
                <Link href={`/clients/${client.id}`} className="hover:text-primary">
                  {client.name}
                </Link>
              ) : null}
              <span aria-hidden>·</span>
              {t(`type.content.${post.contentType}`)}
            </p>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight sm:text-[28px]">
              {post.title}
              <StatusBadge kind="content" value={post.status} />
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editable ? (
              <ContentComposer
                key={`${post.id}-${post.version}`}
                clients={toComposerClients(clients)}
                post={toComposerPost(post)}
                trigger={
                  <Button variant="secondary">
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
            <ConfirmButton action={deleteContentAction.bind(null, post.id)} label={t('content.delete')} redirectTo="/content" />
          </div>
        </header>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section aria-label={t('content.preview.title')} className="space-y-3">
          {post.platforms.length > 1 ? (
            <FilterChips items={post.platforms.map((p) => ({ href: withQuery(base, sp, { platform: p }), label: PLATFORM_META[p].label, active: p === previewPlatform }))} />
          ) : null}
          {previewPlatform ? (
            <PostPreview
              clientName={client?.name ?? ''}
              clientColor={client?.color ?? '#18E889'}
              platform={previewPlatform}
              contentType={post.contentType}
              caption={post.caption}
              title={post.title}
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
              </dl>

              <div className="flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
                {(post.status === 'DRAFT' || post.status === 'CHANGES_REQUESTED') && (
                  <ActionButton variant="primary" icon={<Send />} label={t('content.action.submit')} action={moveContentAction.bind(null, post.id, 'IN_REVIEW')} />
                )}
                {post.status === 'IN_REVIEW' && approver ? <ReviewActions contentId={post.id} title={post.title} /> : null}
                {post.status === 'IN_REVIEW' && !approver ? (
                  <>
                    <span className="text-sm text-muted">{t('content.waiting')}</span>
                    <ActionButton variant="ghost" icon={<Undo2 />} label={t('content.action.withdraw')} action={moveContentAction.bind(null, post.id, 'DRAFT')} />
                  </>
                ) : null}
                {post.status === 'APPROVED' && approver ? (
                  <ActionButton variant="primary" icon={<CalendarPlus />} label={t('content.action.schedule')} action={moveContentAction.bind(null, post.id, 'SCHEDULED')} />
                ) : null}
                {post.status === 'SCHEDULED' && approver ? (
                  <>
                    <ActionButton variant="primary" icon={<Rocket />} label={t('content.action.publish')} action={moveContentAction.bind(null, post.id, 'PUBLISHED')} />
                    <ActionButton variant="ghost" icon={<Undo2 />} label={t('content.action.unschedule')} action={moveContentAction.bind(null, post.id, 'APPROVED')} />
                  </>
                ) : null}
                {post.status === 'PUBLISHED' ? <span className="text-sm text-muted">{t('content.published.note')}</span> : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('content.activity.title')} description={t('content.activity.desc')} />
            <CardBody className="space-y-5">
              <ActivityTimeline events={events} />
              <InlineMessageForm action={addCommentAction.bind(null, post.id)} label={t('content.comment.label')} placeholder={t('content.comment.placeholder')} submitLabel={t('content.comment.send')} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
