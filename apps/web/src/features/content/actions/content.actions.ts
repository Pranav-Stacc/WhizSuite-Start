'use server';

import { z } from 'zod';
import { ContentStatuses, ApprovalActions, createContentSchema, messageSchema, scheduleSchema, type ApprovalAction, type ContentStatus, type CreateContentInput } from '@agency-os/contracts';
import { requireSession, type Session } from '@/shared/auth/session';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { dateTimeLocalToIso } from '@/shared/lib/format';
import { reorderContent, transitionContent } from '@/shared/api/live/mutations';
import { isLiveMode } from '@/shared/config/env';
import { recordAudit } from '@/features/audit/services/audit.service';
import { listAssets } from '@/features/media/services/media.service';
import { pushNotification } from '@/features/notifications/services/notifications.service';
import { listMembers } from '@/features/team/services/members.service';
import { contentRepository, type ContentEvent, type Post, type PostMedia } from '../data/content.repository';
import { listClientContent, recordContentEvent } from '../services/content.service';
import { canApprove, checkTransition, isEditable, resetsApprovalOnEdit } from '../workflow';

const DECISION_TARGET: Record<ApprovalAction, ContentStatus> = { APPROVED: 'APPROVED', CHANGES_REQUESTED: 'CHANGES_REQUESTED', REJECTED: 'DRAFT' };
const DECISION_EVENT: Record<ApprovalAction, ContentEvent['kind']> = { APPROVED: 'approved', CHANGES_REQUESTED: 'changes', REJECTED: 'rejected' };

const reorderSchema = z.object({
  clientId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});

async function authorize(): Promise<Session> {
  const session = await requireSession();
  if (!ROLES_STAFF.includes(session.role)) throw new Error('forbidden');
  return session;
}

async function logEvent(contentId: string, kind: ContentEvent['kind'], session: Session, body: string): Promise<void> {
  await recordContentEvent(contentId, kind, session.name, body);
}

async function notifyApprovers(post: Post, actor: Session): Promise<void> {
  const approvers = (await listMembers()).filter((m) => canApprove(m.role) && m.id !== actor.userId);
  await Promise.all(
    approvers.map((m) => pushNotification({ userId: m.id, kind: 'approval', title: t('content.notify.review.title'), body: t('content.notify.review.body', { title: post.title }), href: `/content/${post.id}` })),
  );
}

async function notifyAuthor(post: Post, actor: Session, title: string): Promise<void> {
  if (post.authorId !== actor.userId) {
    await pushNotification({ userId: post.authorId, kind: 'approval', title, body: post.title, href: `/content/${post.id}` });
  }
}

/** Resolves selected library assets into ordered slides; ids the library does not know are dropped. */
async function resolveSlides(ids: string[], existing: PostMedia[] = []): Promise<PostMedia[]> {
  if (!ids.length) return [];
  const known = new Map<string, PostMedia>(existing.map((m) => [m.assetId, m]));
  for (const asset of await listAssets()) known.set(asset.id, { assetId: asset.id, name: asset.name, mimeType: asset.mimeType, url: asset.url });
  return ids.flatMap((id) => known.get(id) ?? []);
}

async function postFields(input: CreateContentInput, existing?: PostMedia[]) {
  return {
    clientId: input.clientId,
    title: input.title,
    caption: input.caption ?? '',
    contentType: input.contentType,
    platforms: input.platforms,
    scheduledAt: input.scheduledAt ? dateTimeLocalToIso(input.scheduledAt) : undefined,
    hashtags: input.hashtags,
    ctaUrl: input.ctaUrl,
    pillar: input.pillar,
    media: await resolveSlides(input.mediaAssetIds, existing),
  };
}

export async function createContentAction(raw: unknown): Promise<ActionResult<{ id: string; href: string }>> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createContentSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const now = new Date().toISOString();

    const post = await contentRepository.create({
      ...(await postFields(input)),
      status: input.submitForApproval ? 'IN_REVIEW' : 'DRAFT',
      authorId: session.userId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    if (input.submitForApproval) {
      await logEvent(post.id, 'submitted', session, t('content.event.submitted'));
      await notifyApprovers(post, session);
    }
    await recordAudit({ action: 'content.created', entityType: 'content', entityId: post.id, entityLabel: post.title, summary: 'Created content' });
    await refreshData('content');
    return succeed({ id: post.id, href: `/content/${post.id}` }, t('content.created'));
  });
}

export async function updateContentAction(id: string, raw: unknown): Promise<ActionResult<{ id: string; href: string }>> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createContentSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const before = await contentRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (!isEditable(before.status)) return fail(t('content.error.locked'));

    const status: ContentStatus = input.submitForApproval ? 'IN_REVIEW' : resetsApprovalOnEdit(before.status) ? 'DRAFT' : before.status;
    const statusChanged = status !== before.status;
    await contentRepository.update(id, {
      ...(await postFields(input, before.media)),
      ...(isLiveMode ? {} : { status }),
      updatedAt: new Date().toISOString(),
      version: before.version + 1,
    });
    if (statusChanged && isLiveMode) await transitionContent(id, status);
    if (status === 'IN_REVIEW' && before.status !== 'IN_REVIEW') {
      await logEvent(id, 'submitted', session, t('content.event.submitted'));
      await notifyApprovers({ ...before, title: input.title }, session);
    }
    await recordAudit({
      action: 'content.updated',
      entityType: 'content',
      entityId: id,
      entityLabel: input.title,
      summary: 'Updated content',
      diff: statusChanged ? { status: { from: before.status, to: status } } : undefined,
    });
    await refreshData('content');
    return succeed({ id, href: `/content/${id}` }, t('content.updated'));
  });
}

/** Moves a post along the workflow (board drag, detail buttons). Enforces transition + role rules. */
export async function moveContentAction(id: string, target: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    if (!ContentStatuses.includes(target as ContentStatus)) return fail(t('toast.failed'));
    const post = await contentRepository.get(id);
    if (!post) return fail(t('toast.failed'));

    const check = checkTransition(session.role, post, target as ContentStatus);
    if (check === 'invalid') return fail(t('content.error.transition'));
    if (check === 'forbidden') return fail(t('content.error.forbidden'));
    if (check === 'needsSchedule') return fail(t('content.error.needsSchedule'));

    if (isLiveMode) await transitionContent(id, target);
    else await contentRepository.update(id, { status: target as ContentStatus, updatedAt: new Date().toISOString() });
    if (target === 'IN_REVIEW') {
      await logEvent(id, 'submitted', session, t('content.event.submitted'));
      await notifyApprovers(post, session);
    }
    if (target === 'SCHEDULED') await logEvent(id, 'scheduled', session, t('content.event.scheduled'));
    if (target === 'PUBLISHED') await logEvent(id, 'published', session, t('content.event.published'));
    await recordAudit({
      action: 'content.status_changed',
      entityType: 'content',
      entityId: id,
      entityLabel: post.title,
      summary: 'Changed content status',
      diff: { status: { from: post.status, to: target } },
    });
    await refreshData('content');
    return succeed(undefined, t('content.moved'));
  });
}

export async function decideContentAction(id: string, decision: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    if (!canApprove(session.role)) return fail(t('content.error.forbidden'));
    if (!ApprovalActions.includes(decision as ApprovalAction)) return fail(t('toast.failed'));
    const action = decision as ApprovalAction;
    const parsed = parseInput(messageSchema, raw);
    if (!parsed.ok && action !== 'APPROVED') return parsed.result;
    const comment = parsed.ok ? parsed.data.body : t('content.event.approvedDefault');

    const post = await contentRepository.get(id);
    if (!post) return fail(t('toast.failed'));
    if (post.status !== 'IN_REVIEW') return fail(t('content.error.transition'));

    const nextStatus = DECISION_TARGET[action];
    if (isLiveMode) await transitionContent(id, nextStatus);
    else await contentRepository.update(id, { status: nextStatus, updatedAt: new Date().toISOString() });
    await logEvent(id, DECISION_EVENT[action], session, comment);
    await notifyAuthor(post, session, t(`content.notify.${action}`));
    await recordAudit({
      action: `content.${DECISION_EVENT[action]}`,
      entityType: 'content',
      entityId: id,
      entityLabel: post.title,
      summary: `Decision: ${action}`,
      diff: { status: { from: post.status, to: DECISION_TARGET[action] } },
    });
    await refreshData('content');
    return succeed(undefined, t(`content.decision.${action}`));
  });
}

export async function addCommentAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(messageSchema, raw);
    if (!parsed.ok) return parsed.result;
    const post = await contentRepository.get(id);
    if (!post) return fail(t('toast.failed'));
    await logEvent(id, 'comment', session, parsed.data.body);
    await notifyAuthor(post, session, t('content.notify.comment'));
    await recordAudit({ action: 'content.commented', entityType: 'content', entityId: id, entityLabel: post.title, summary: 'Commented on content' });
    await refreshData('content');
    return succeed(undefined, t('content.comment.sent'));
  });
}

export async function rescheduleContentAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(scheduleSchema, raw);
    if (!parsed.ok) return parsed.result;
    const post = await contentRepository.get(id);
    if (!post) return fail(t('toast.failed'));
    if (!isEditable(post.status)) return fail(t('content.error.locked'));

    const scheduledAt = dateTimeLocalToIso(parsed.data.scheduledAt);
    await contentRepository.update(id, { scheduledAt, updatedAt: new Date().toISOString() });
    await logEvent(id, 'scheduled', session, t('content.event.rescheduled'));
    await recordAudit({
      action: 'content.rescheduled',
      entityType: 'content',
      entityId: id,
      entityLabel: post.title,
      summary: 'Rescheduled content',
      diff: { scheduledAt: { from: post.scheduledAt, to: scheduledAt } },
    });
    await refreshData('content');
    return succeed(undefined, t('calendar.rescheduled'));
  });
}

/** Persists the client's grid planner order (first id = top-left tile). */
export async function reorderGridAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(reorderSchema, raw);
    if (!parsed.ok) return parsed.result;
    const { clientId, orderedIds } = parsed.data;
    const owned = new Set((await listClientContent(clientId)).map((p) => p.id));
    if (!orderedIds.every((id) => owned.has(id))) return fail(t('content.error.forbidden'));

    if (isLiveMode) await reorderContent(clientId, orderedIds);
    else await Promise.all(orderedIds.map((id, gridPosition) => contentRepository.update(id, { gridPosition })));
    await recordAudit({ action: 'content.reordered', entityType: 'client', entityId: clientId, entityLabel: clientId, summary: 'Reordered grid plan' });
    await refreshData('content');
    return succeed(undefined, t('grid.reordered'));
  });
}

export async function deleteContentAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const post = await contentRepository.get(id);
    if (!post) return fail(t('toast.failed'));
    await contentRepository.remove(id);
    await recordAudit({ action: 'content.deleted', entityType: 'content', entityId: id, entityLabel: post.title, summary: 'Deleted content' });
    await refreshData('content');
    return succeed(undefined, t('content.deleted'));
  });
}
