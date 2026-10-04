'use server';

import { ApprovalActions, UserRoles, messageSchema, type ApprovalAction, type ContentStatus } from '@agency-os/contracts';
import { requireSession, type Session } from '@/shared/auth/session';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { contentEventsRepository, contentRepository, type ContentEvent } from '@/features/content/data/content.repository';
import { pushNotification } from '@/features/notifications/services/notifications.service';
import { threadRepository } from '../data/thread.repository';

const DECISION_TARGET: Record<ApprovalAction, ContentStatus> = { APPROVED: 'APPROVED', CHANGES_REQUESTED: 'CHANGES_REQUESTED', REJECTED: 'DRAFT' };
const DECISION_EVENT: Record<ApprovalAction, ContentEvent['kind']> = { APPROVED: 'approved', CHANGES_REQUESTED: 'changes', REJECTED: 'rejected' };

async function requireClient(): Promise<Session & { clientId: string }> {
  const session = await requireSession();
  if (session.role !== UserRoles.CLIENT || !session.clientId) throw new Error('forbidden');
  return { ...session, clientId: session.clientId };
}

async function logEvent(contentId: string, kind: ContentEvent['kind'], session: Session, body: string): Promise<void> {
  await contentEventsRepository.create({ contentId, kind, actorName: session.name, body, at: new Date().toISOString() });
}

async function notifyAuthor(post: { id: string; authorId: string; title: string }, session: Session, title: string): Promise<void> {
  if (post.authorId !== session.userId) {
    await pushNotification({ userId: post.authorId, kind: 'approval', title, body: post.title, href: `/content/${post.id}` });
  }
}

export async function clientDecideContentAction(id: string, decision: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireClient();
    if (!ApprovalActions.includes(decision as ApprovalAction)) return fail(t('toast.failed'));
    const action = decision as ApprovalAction;
    const parsed = parseInput(messageSchema, raw);
    if (!parsed.ok && action !== 'APPROVED') return parsed.result;
    const comment = parsed.ok ? parsed.data.body : t('content.event.approvedDefault');

    const post = await contentRepository.get(id);
    if (!post || post.clientId !== session.clientId) return fail(t('content.error.forbidden'));
    if (post.status !== 'IN_REVIEW') return fail(t('content.error.transition'));

    await contentRepository.update(id, { status: DECISION_TARGET[action], updatedAt: new Date().toISOString() });
    await logEvent(id, DECISION_EVENT[action], session, comment);
    await notifyAuthor(post, session, t(`content.notify.${action}`));
    await recordAudit({
      action: `content.${DECISION_EVENT[action]}`,
      entityType: 'content',
      entityId: id,
      entityLabel: post.title,
      summary: `Client decision: ${action}`,
      diff: { status: { from: post.status, to: DECISION_TARGET[action] } },
    });
    await refreshData('content', 'portal');
    return succeed(undefined, t(`content.decision.${action}`));
  });
}

export async function sendPortalMessageAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireClient();
    const parsed = parseInput(messageSchema, raw);
    if (!parsed.ok) return parsed.result;
    const message = await threadRepository.create({
      clientId: session.clientId,
      fromClient: true,
      authorName: session.name,
      body: parsed.data.body,
      at: new Date().toISOString(),
    });
    await recordAudit({
      action: 'portal.message_sent',
      entityType: 'thread',
      entityId: message.id,
      entityLabel: session.name,
      summary: 'Client sent a portal message',
    });
    await refreshData('portal');
    return succeed(undefined, t('portal.messages.sent'));
  });
}
