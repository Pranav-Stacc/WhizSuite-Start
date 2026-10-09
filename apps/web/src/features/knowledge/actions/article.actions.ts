'use server';

import { createArticleSchema, Permissions } from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { knowledgeRepository } from '../data/knowledge.repository';


export async function createArticleAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.ORG_SETTINGS_MANAGE);
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
    await authorize(Permissions.ORG_SETTINGS_MANAGE);
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
    await authorize(Permissions.ORG_SETTINGS_MANAGE);
    const before = await knowledgeRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await knowledgeRepository.remove(id);
    await recordAudit({ action: 'article.deleted', entityType: 'article', entityId: id, entityLabel: before.title, summary: 'Deleted knowledge article' });
    await refreshData('knowledge');
    return succeed(undefined, t('knowledge.deleted'));
  });
}
