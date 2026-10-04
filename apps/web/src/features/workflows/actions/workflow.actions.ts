'use server';

import { createWorkflowSchema, parseWorkflowStages, type CreateWorkflowInput } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { workflowsRepository } from '../data/workflows.repository';

async function authorize() {
  const session = await requireSession();
  if (!ROLES_LEADERSHIP.includes(session.role)) throw new Error('forbidden');
  return session;
}

function toWorkflowFields(input: CreateWorkflowInput) {
  return {
    name: input.name,
    stages: parseWorkflowStages(input.stages),
    slaHours: input.slaHours,
    requiresClientApproval: input.requiresClientApproval,
  };
}

export async function createWorkflowAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(createWorkflowSchema, raw);
    if (!parsed.ok) return parsed.result;
    const workflow = await workflowsRepository.create({ ...toWorkflowFields(parsed.data), active: true });
    await recordAudit({ action: 'workflow.created', entityType: 'workflow', entityId: workflow.id, entityLabel: workflow.name, summary: 'Created approval workflow' });
    await refreshData('workflows');
    return succeed(undefined, t('workflows.created'));
  });
}

export async function updateWorkflowAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(createWorkflowSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = await workflowsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await workflowsRepository.update(id, toWorkflowFields(parsed.data));
    await recordAudit({ action: 'workflow.updated', entityType: 'workflow', entityId: id, entityLabel: parsed.data.name, summary: 'Updated approval workflow' });
    await refreshData('workflows');
    return succeed(undefined, t('workflows.updated'));
  });
}

export async function toggleWorkflowAction(id: string, active: boolean): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await workflowsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await workflowsRepository.update(id, { active });
    await recordAudit({
      action: active ? 'workflow.activated' : 'workflow.deactivated',
      entityType: 'workflow',
      entityId: id,
      entityLabel: before.name,
      summary: active ? 'Activated workflow' : 'Deactivated workflow',
      diff: { active: { from: String(before.active), to: String(active) } },
    });
    await refreshData('workflows');
    return succeed(undefined, active ? t('workflows.activated') : t('workflows.deactivated'));
  });
}

export async function deleteWorkflowAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await workflowsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await workflowsRepository.remove(id);
    await recordAudit({ action: 'workflow.deleted', entityType: 'workflow', entityId: id, entityLabel: before.name, summary: 'Deleted approval workflow' });
    await refreshData('workflows');
    return succeed(undefined, t('workflows.deleted'));
  });
}
