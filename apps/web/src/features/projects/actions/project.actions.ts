'use server';

import { createProjectSchema, Permissions } from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { dateKeyToIso } from '@/shared/lib/format';
import { recordAudit } from '@/features/audit/services/audit.service';
import { getClient } from '@/features/clients/services/clients.service';
import { projectsRepository } from '../data/projects.repository';

const MINOR_UNITS_PER_RUPEE = 100;
const DEFAULT_PROJECT_TYPE = 'Campaign';


export async function createProjectAction(raw: unknown): Promise<ActionResult<{ href: string }>> {
  return guarded(async () => {
    const session = await authorize(Permissions.PROJECTS_CREATE);
    const parsed = parseInput(createProjectSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const client = await getClient(input.clientId);
    if (!client) return fail(t('toast.failed'), { clientId: 'validation.required' });

    const project = await projectsRepository.create({
      clientId: client.id,
      name: input.name,
      type: input.type || DEFAULT_PROJECT_TYPE,
      status: input.status,
      startDate: new Date().toISOString(),
      endDate: input.endDate ? dateKeyToIso(input.endDate) : undefined,
      budgetMinor: Math.round((input.budget ?? 0) * MINOR_UNITS_PER_RUPEE),
      ownerId: session.userId,
    });
    await recordAudit({ action: 'project.created', entityType: 'project', entityId: project.id, entityLabel: project.name, summary: 'Created project' });
    await refreshData('projects', 'clients');
    return succeed({ href: `/projects/${project.id}` }, t('projects.created'));
  });
}

export async function updateProjectAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.PROJECTS_EDIT);
    const parsed = parseInput(createProjectSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const before = await projectsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    const client = await getClient(input.clientId);
    if (!client) return fail(t('toast.failed'), { clientId: 'validation.required' });

    await projectsRepository.update(id, {
      clientId: client.id,
      name: input.name,
      type: input.type || before.type,
      status: input.status,
      endDate: input.endDate ? dateKeyToIso(input.endDate) : undefined,
      budgetMinor: Math.round((input.budget ?? 0) * MINOR_UNITS_PER_RUPEE),
    });
    await recordAudit({
      action: 'project.updated',
      entityType: 'project',
      entityId: id,
      entityLabel: input.name,
      summary: 'Updated project',
      diff: before.status !== input.status ? { status: { from: before.status, to: input.status } } : undefined,
    });
    await refreshData('projects', 'clients');
    return succeed(undefined, t('projects.updated'));
  });
}
