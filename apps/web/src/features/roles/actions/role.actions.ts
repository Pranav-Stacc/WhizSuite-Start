'use server';

import { z } from 'zod';
import { requireSession } from '@/shared/auth/session';
import { ROLES_OWNER } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { rolesRepository } from '../data/roles.repository';

const createRoleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).min(1),
});

async function authorize() {
  const session = await requireSession();
  if (!ROLES_OWNER.includes(session.role)) throw new Error('forbidden');
  return session;
}

export async function createRoleAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(createRoleSchema, raw);
    if (!parsed.ok) return parsed.result;
    const role = await rolesRepository.create({
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      isSystem: false,
      permissionKeys: parsed.data.permissionKeys,
      memberCount: 0,
    });
    await recordAudit({ action: 'role.created', entityType: 'role', entityId: role.id, entityLabel: role.name, summary: 'Created role' });
    await refreshData('roles');
    return succeed(undefined, t('roles.created'));
  });
}

export async function updateRolePermissionsAction(id: string, permissionKeys: string[]): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await rolesRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (before.isSystem) return fail(t('roles.system.protected'));
    await rolesRepository.update(id, { permissionKeys });
    await recordAudit({ action: 'role.permissions_updated', entityType: 'role', entityId: id, entityLabel: before.name, summary: 'Updated role permissions' });
    await refreshData('roles');
    return succeed(undefined, t('roles.updated'));
  });
}
