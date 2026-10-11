import { Permissions, RoleKinds, moduleKeyForPermission } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { Lock, Shield, Trash2, Users } from 'lucide-react';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { humanizeKey } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { PageHeader } from '@/shared/ui/page-header';
import { StatCard, StatGrid } from '@/shared/ui/stat-card';
import { deleteRoleAction } from '@/features/roles/actions/role.actions';
import { RoleDialog } from '@/features/roles/components/role-dialog';
import type { AgencyRole } from '@/features/roles/data/roles.repository';
import { listPermissionCatalog } from '@/features/roles/services/permissions.service';
import { listRoles } from '@/features/roles/services/roles.service';
import { loadScopeResources } from '@/features/team/services/scope-resources.service';

const MODULES_SHOWN = 6;

function moduleGrants(role: AgencyRole): { module: string; scopes: string[] }[] {
  const rows =
    role.permissionScopes.length > 0
      ? role.permissionScopes
      : role.permissionKeys.map((key) => ({ key, scopeTypes: role.defaultScopeTypes }));
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const module = moduleKeyForPermission(row.key);
    const scopes = map.get(module) ?? new Set<string>();
    for (const scope of row.scopeTypes) scopes.add(scope);
    map.set(module, scopes);
  }
  return [...map.entries()].map(([module, scopes]) => ({ module, scopes: [...scopes] }));
}

export const metadata: Metadata = { title: t('roles.title') };

const PERMISSIONS_SHOWN = 8;

export default async function RolesPage() {
  await requirePermission(Permissions.ROLES_MANAGE);
  const [roles, permissions, scopeResources] = await Promise.all([
    listRoles(),
    listPermissionCatalog(),
    loadScopeResources(),
  ]);
  const customCount = roles.filter((r) => !r.isSystem).length;
  const sorted = [...roles].sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title={t('roles.title')}
        description={t('roles.description')}
        actions={
          <span data-tour="setup-roles">
            <RoleDialog permissions={permissions} scopeResources={scopeResources} />
          </span>
        }
      />
      <StatGrid cols={3}>
        <StatCard label={t('roles.stat.total')} value={roles.length} icon={<Shield />} />
        <StatCard label={t('roles.stat.custom')} value={customCount} icon={<Shield />} />
        <StatCard label={t('roles.stat.permissions')} value={permissions.length} icon={<Users />} />
      </StatGrid>
      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {sorted.map((role) => (
          <li key={role.id}>
            <Card className="flex h-full flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{role.name}</h3>
                    {role.isSystem ? <Badge tone="neutral">{t('roles.system')}</Badge> : null}
                    <Badge tone={role.kind === RoleKinds.WORKFLOW ? 'violet' : 'primary'}>
                      {role.kind === RoleKinds.WORKFLOW ? t('roles.kind.workflow') : t('roles.kind.access')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{role.description || (role.isSystem ? t('roles.system.hint') : t('roles.noDescription'))}</p>
                </div>
                <Badge tone="primary">{t('roles.members', { count: role.memberCount })}</Badge>
              </div>
              {role.isSystem ? (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {role.defaultScopeTypes.map((scope) => (
                    <li key={scope} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                      {humanizeKey(scope)}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-2 space-y-1">
                  {moduleGrants(role)
                    .slice(0, MODULES_SHOWN)
                    .map((grant) => (
                      <li key={grant.module} className="text-[11px] text-muted">
                        <span className="font-medium text-foreground">{humanizeKey(grant.module)}</span>
                        {' · '}
                        {grant.scopes.map((scope) => humanizeKey(scope)).join(', ')}
                      </li>
                    ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted">{t('roles.permissionCount', { count: role.permissionKeys.length })}</p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {role.permissionKeys.slice(0, PERMISSIONS_SHOWN).map((key) => (
                  <li key={key} title={key} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                    {humanizeKey(key)}
                  </li>
                ))}
                {role.permissionKeys.length > PERMISSIONS_SHOWN ? (
                  <li className="px-1 text-[11px] text-muted">{t('roles.morePermissions', { count: role.permissionKeys.length - PERMISSIONS_SHOWN })}</li>
                ) : null}
              </ul>
              <div className="mt-auto flex items-center justify-end gap-2 pt-3">
                {role.isSystem ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                    <Lock className="size-3.5" aria-hidden />
                    {t('roles.system.readOnly')}
                  </span>
                ) : (
                  <>
                    <RoleDialog permissions={permissions} role={role} scopeResources={scopeResources} />
                    {role.memberCount > 0 ? (
                      <span className="text-[11px] text-muted">{t('roles.inUse', { count: role.memberCount })}</span>
                    ) : (
                      <ConfirmButton action={deleteRoleAction.bind(null, role.id)} label={t('roles.delete')} icon={<Trash2 className="size-4" />} size="sm" />
                    )}
                  </>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
