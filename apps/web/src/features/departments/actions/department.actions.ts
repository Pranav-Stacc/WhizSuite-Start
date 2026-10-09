'use server';

import { Permissions } from '@agency-os/contracts';
import { z } from 'zod';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { departmentsRepository } from '../data/departments.repository';

const createDepartmentSchema = z.object({
  name: z.string().min(2),
  parentId: z.string().uuid().optional().or(z.literal('')),
});


export async function createDepartmentAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.ORG_SETTINGS_MANAGE);
    const parsed = parseInput(createDepartmentSchema, raw);
    if (!parsed.ok) return parsed.result;
    const dept = await departmentsRepository.create({
      name: parsed.data.name,
      path: `/${parsed.data.name.toLowerCase().replace(/\s+/g, '-')}`,
      parentId: parsed.data.parentId || undefined,
      headcount: 0,
      createdAt: new Date().toISOString(),
    });
    await recordAudit({ action: 'department.created', entityType: 'department', entityId: dept.id, entityLabel: dept.name, summary: 'Created department' });
    await refreshData('departments');
    return succeed(undefined, t('departments.created'));
  });
}

export async function deleteDepartmentAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.ORG_SETTINGS_MANAGE);
    const before = await departmentsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await departmentsRepository.remove(id);
    await recordAudit({ action: 'department.deleted', entityType: 'department', entityId: id, entityLabel: before.name, summary: 'Deleted department' });
    await refreshData('departments');
    return succeed(undefined, t('departments.deleted'));
  });
}
