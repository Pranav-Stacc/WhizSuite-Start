'use server';

import { messageSchema } from '@agency-os/contracts';
import { replyToConversation } from '@/shared/api/live/mutations';
import { requireSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { InboxStatuses, inboxRepository, type InboxStatus } from '../data/inbox.repository';

async function authorize() {
  const session = await requireSession();
  if (!ROLES_STAFF.includes(session.role)) throw new Error('forbidden');
  return session;
}

export async function replyToInboxItemAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(messageSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = await inboxRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (isLiveMode) await replyToConversation(id, parsed.data.body);
    else await inboxRepository.update(id, { reply: parsed.data.body, status: 'replied', assigneeId: before.assigneeId ?? session.userId });
    await recordAudit({
      action: 'inbox.replied',
      entityType: 'inbox_item',
      entityId: id,
      entityLabel: before.author,
      summary: 'Replied to conversation',
      diff: { status: { from: before.status, to: 'replied' } },
    });
    await refreshData('inbox');
    return succeed(undefined, t('inbox.replied'));
  });
}

export async function setInboxStatusAction(id: string, status: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    if (!InboxStatuses.includes(status as InboxStatus)) return fail(t('toast.failed'));
    const before = await inboxRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await inboxRepository.update(id, { status: status as InboxStatus });
    await recordAudit({
      action: 'inbox.status_changed',
      entityType: 'inbox_item',
      entityId: id,
      entityLabel: before.author,
      summary: 'Changed conversation status',
      diff: { status: { from: before.status, to: status } },
    });
    await refreshData('inbox');
    return succeed(undefined, t('inbox.status.updated'));
  });
}

export async function assignInboxItemAction(id: string, memberId: string | undefined): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const before = await inboxRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    const assigneeId = memberId ?? undefined;
    await inboxRepository.update(id, { assigneeId });
    await recordAudit({
      action: 'inbox.assigned',
      entityType: 'inbox_item',
      entityId: id,
      entityLabel: before.author,
      summary: assigneeId ? 'Assigned conversation' : 'Unassigned conversation',
      diff: { assignee: { from: before.assigneeId, to: assigneeId } },
    });
    await refreshData('inbox');
    return succeed(undefined, assigneeId === session.userId ? t('inbox.assigned.me') : t('inbox.assigned'));
  });
}
