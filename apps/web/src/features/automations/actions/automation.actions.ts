'use server';

import { createAutomationSchema } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { AUTOMATION_RECIPES } from '../config';
import { automationRunsRepository, automationsRepository } from '../data/automations.repository';

async function authorize() {
  const session = await requireSession();
  if (!ROLES_LEADERSHIP.includes(session.role)) throw new Error('forbidden');
  return session;
}

export async function createAutomationAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(createAutomationSchema, raw);
    if (!parsed.ok) return parsed.result;
    const automation = await automationsRepository.create({ ...parsed.data, enabled: true, runs: 0, failures: 0, createdAt: new Date().toISOString() });
    await recordAudit({ action: 'automation.created', entityType: 'automation', entityId: automation.id, entityLabel: automation.name, summary: 'Created automation' });
    await refreshData('automations');
    return succeed(undefined, t('automations.created'));
  });
}

export async function createAutomationFromRecipeAction(recipeId: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const recipe = AUTOMATION_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return fail(t('toast.failed'));
    const automation = await automationsRepository.create({
      name: t(recipe.nameKey),
      trigger: recipe.trigger,
      action: recipe.action,
      enabled: true,
      runs: 0,
      failures: 0,
      createdAt: new Date().toISOString(),
    });
    await recordAudit({ action: 'automation.created', entityType: 'automation', entityId: automation.id, entityLabel: automation.name, summary: 'Created automation from recipe' });
    await refreshData('automations');
    return succeed(undefined, t('automations.created'));
  });
}

export async function updateAutomationAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(createAutomationSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = await automationsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await automationsRepository.update(id, parsed.data);
    await recordAudit({ action: 'automation.updated', entityType: 'automation', entityId: id, entityLabel: parsed.data.name, summary: 'Updated automation' });
    await refreshData('automations');
    return succeed(undefined, t('automations.updated'));
  });
}

export async function toggleAutomationAction(id: string, enabled: boolean): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await automationsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await automationsRepository.update(id, { enabled });
    await recordAudit({
      action: enabled ? 'automation.enabled' : 'automation.disabled',
      entityType: 'automation',
      entityId: id,
      entityLabel: before.name,
      summary: enabled ? 'Enabled automation' : 'Disabled automation',
      diff: { enabled: { from: String(before.enabled), to: String(enabled) } },
    });
    await refreshData('automations');
    return succeed(undefined, enabled ? t('automations.enabled') : t('automations.disabled'));
  });
}

export async function runAutomationAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const automation = await automationsRepository.get(id);
    if (!automation) return fail(t('toast.failed'));
    const at = new Date().toISOString();
    await automationRunsRepository.create({ automationId: id, at, ok: true, detail: t('automations.run.manual', { name: automation.name }) });
    await automationsRepository.update(id, { runs: automation.runs + 1, lastRunAt: at });
    await recordAudit({ action: 'automation.run', entityType: 'automation', entityId: id, entityLabel: automation.name, summary: 'Ran automation manually' });
    await refreshData('automations');
    return succeed(undefined, t('automations.run.done', { name: automation.name }));
  });
}

export async function deleteAutomationAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await automationsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await automationsRepository.remove(id);
    await recordAudit({ action: 'automation.deleted', entityType: 'automation', entityId: id, entityLabel: before.name, summary: 'Deleted automation' });
    await refreshData('automations');
    return succeed(undefined, t('automations.deleted'));
  });
}
