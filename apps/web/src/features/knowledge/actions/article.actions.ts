'use server';

import { createArticleSchema } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { knowledgeRepository } from '../data/knowledge.repository';

async function authorize() {
  const session = await requireSession();
  if (!ROLES_LEADERSHIP.includes(session.role)) throw new Error('forbidden');
  return session;
}

export async function createArticleAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createArticleSchema, raw);
    if (!parsed.ok) return parsed.result;
    const article = await knowledgeRepository.create({ ...parsed.data, authorId: session.userId, updatedAt: new Date().toISOString() });
    await recordAudit({ action: 'article.created', entityType: 'article', entityId: article.id, entityLabel: article.title, summary: 'Published knowledge article' });
    await refreshData('knowledge');
    return succeed(undefined, t('knowledge.created'));
  });
}

export async function updateArticleAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(createArticleSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = await knowledgeRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await knowledgeRepository.update(id, { ...parsed.data, updatedAt: new Date().toISOString() });
    await recordAudit({
      action: 'article.updated',
      entityType: 'article',
      entityId: id,
      entityLabel: parsed.data.title,
      summary: 'Edited knowledge article',
      diff: before.title === parsed.data.title ? undefined : { title: { from: before.title, to: parsed.data.title } },
    });
    await refreshData('knowledge');
    return succeed(undefined, t('knowledge.updated'));
  });
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await knowledgeRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await knowledgeRepository.remove(id);
    await recordAudit({ action: 'article.deleted', entityType: 'article', entityId: id, entityLabel: before.title, summary: 'Deleted knowledge article' });
    await refreshData('knowledge');
    return succeed(undefined, t('knowledge.deleted'));
  });
}
