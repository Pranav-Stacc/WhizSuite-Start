'use server';

import { Permissions, RoleKinds, roleInputSchema } from '@agency-os/contracts';
import { ApiError } from '@/shared/api/api-client';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { rolesRepository } from '../data/roles.repository';

const CONFLICT = 409;

export async function createRoleAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.ROLES_MANAGE);
    const parsed = parseInput(roleInputSchema, raw);
    if (!parsed.ok) return parsed.result;
    const role = await rolesRepository.create({
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      isSystem: false,
      kind: parsed.data.kind,
      defaultScopeTypes: [...parsed.data.defaultScopeTypes],
      permissionKeys: parsed.data.permissionKeys,
      permissionScopes: parsed.data.permissionScopes ? [...parsed.data.permissionScopes] : [],
      memberCount: 0,
    });
    await recordAudit({ action: 'role.created', entityType: 'role', entityId: role.id, entityLabel: role.name, summary: 'Created role' });
    await refreshData('roles');
    return succeed(undefined, t('roles.created'));
  });
}

export async function updateRoleAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.ROLES_MANAGE);
    const parsed = parseInput(roleInputSchema, raw);
    if (!parsed.ok) return parsed.result;
    const existing = await rolesRepository.get(id);
    const updated = await rolesRepository.update(id, {
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      kind: parsed.data.kind ?? existing?.kind ?? RoleKinds.ACCESS,
      defaultScopeTypes: [...parsed.data.defaultScopeTypes],
      permissionKeys: parsed.data.permissionKeys,
      permissionScopes: parsed.data.permissionScopes
        ? [...parsed.data.permissionScopes]
        : existing?.permissionScopes ?? [],
    });
    if (!updated) return fail(t('roles.notFound'));
    await recordAudit({
      action: 'role.updated',
      entityType: 'role',
      entityId: id,
      entityLabel: parsed.data.name,
      summary: 'Updated role',
      diff: existing
        ? {
            name: { from: existing.name, to: parsed.data.name },
            kind: { from: existing.kind, to: parsed.data.kind },
            scopes: {
              from: existing.defaultScopeTypes.join(', '),
              to: parsed.data.defaultScopeTypes.join(', '),
            },
            permissions: { from: existing.permissionKeys.join(', '), to: parsed.data.permissionKeys.join(', ') },
          }
        : undefined,
    });
    await refreshData('roles', 'team', 'access');
    return succeed(undefined, t('roles.updated'));
  });
}

/** Roles still held by members cannot be deleted, so nobody silently loses access. */
export async function deleteRoleAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.ROLES_MANAGE);
    const before = await rolesRepository.get(id);
    if (!before) return fail(t('roles.notFound'));
    if (before.isSystem) return fail(t('roles.system.protected'));
    if (before.memberCount > 0) return fail(t('roles.inUse', { count: before.memberCount }));
    try {
      await rolesRepository.remove(id);
    } catch (error) {
      if (error instanceof ApiError && error.status === CONFLICT) return fail(t('roles.inUse', { count: before.memberCount }));
      throw error;
    }
    await recordAudit({ action: 'role.deleted', entityType: 'role', entityId: id, entityLabel: before.name, summary: 'Deleted role' });
    await refreshData('roles');
    return succeed(undefined, t('roles.deleted'));
  });
}
