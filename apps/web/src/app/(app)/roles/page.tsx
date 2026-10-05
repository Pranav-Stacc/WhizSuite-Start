import type { Metadata } from 'next';
import { Shield, Users } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_OWNER } from '@/shared/navigation/nav-config';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { StatCard, StatGrid } from '@/shared/ui/stat-card';
import { CreateRoleDialog } from '@/features/roles/components/create-role-dialog';
import { listRoles } from '@/features/roles/services/roles.service';
import { listPermissionCatalog } from '@/features/roles/services/permissions.service';

export const metadata: Metadata = { title: t('roles.title') };

export default async function RolesPage() {
  await requireRole(ROLES_OWNER);
  const [roles, permissions] = await Promise.all([listRoles(), listPermissionCatalog()]);
  const customCount = roles.filter((r) => !r.isSystem).length;

  return (
    <div>
      <PageHeader title={t('roles.title')} description={t('roles.description')} actions={<CreateRoleDialog permissions={permissions} />} />
      <StatGrid cols={3}>
        <StatCard label={t('roles.stat.total')} value={roles.length} icon={<Shield />} />
        <StatCard label={t('roles.stat.custom')} value={customCount} icon={<Shield />} />
        <StatCard label={t('roles.stat.permissions')} value={permissions.length} icon={<Users />} />
      </StatGrid>
      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {roles.map((role) => (
          <li key={role.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{role.name}</h3>
                    {role.isSystem ? <Badge tone="neutral">{t('roles.system')}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{role.description || t('roles.noDescription')}</p>
                </div>
                <Badge tone="primary">{t('roles.members', { count: role.memberCount })}</Badge>
              </div>
              <p className="mt-3 text-xs text-muted">{t('roles.permissionCount', { count: role.permissionKeys.length })}</p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {role.permissionKeys.slice(0, 8).map((key) => (
                  <li key={key} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">{key}</li>
                ))}
                {role.permissionKeys.length > 8 ? <li className="text-[10px] text-muted">+{role.permissionKeys.length - 8}</li> : null}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
