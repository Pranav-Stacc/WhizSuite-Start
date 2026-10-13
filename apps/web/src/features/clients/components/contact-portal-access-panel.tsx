'use client';

import { Shield } from 'lucide-react';
import type { MemberAccess } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { humanizeKey } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import type { AgencyRole } from '@/features/roles/data/roles.repository';
import type { PermissionRow } from '@/features/roles/services/permissions.service';
import { AssignRolesDialog } from '@/features/team/components/assign-roles-dialog';
import { MemberExtrasPanel } from '@/features/team/components/member-extras-panel';
import { MemberRoleScopeSummary } from '@/features/team/components/member-role-scope-summary';
import type { ScopeResourceOptions } from '@/features/team/components/scope-resource-fields';
import type { Member } from '@/features/team/data/members.repository';

interface ContactPortalAccessPanelProps {
  member: Member;
  memberAccess: MemberAccess;
  assignableRoles: Member['roles'];
  roleDetails: AgencyRole[];
  roleGrantedKeys: string[];
  catalog: PermissionRow[];
  scopeResources: ScopeResourceOptions | null;
  canEditAccess: boolean;
}

export function ContactPortalAccessPanel({
  member,
  memberAccess,
  assignableRoles,
  roleDetails,
  roleGrantedKeys,
  catalog,
  scopeResources,
  canEditAccess,
}: ContactPortalAccessPanelProps) {
  const grantedKeys = new Set(memberAccess.effectivePermissions.length ? memberAccess.effectivePermissions : roleGrantedKeys);

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="size-4" />
          {t('clients.contacts.access.title')}
        </h2>
        {canEditAccess ? <AssignRolesDialog member={member} assignable={assignableRoles} /> : null}
      </div>
      <p className="text-xs text-muted">{t('clients.contacts.access.desc')}</p>
      {member.roles.length === 0 ? (
        <p className="text-sm text-muted">{t('team.detail.permissions.empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {member.roles.map((role) => (
            <li key={role.id}>
              <Badge tone={role.isSystem ? 'neutral' : 'info'}>{role.name}</Badge>
            </li>
          ))}
        </ul>
      )}
      {scopeResources && roleDetails.length > 0 ? (
        <MemberRoleScopeSummary roles={roleDetails} scopeResources={scopeResources} />
      ) : null}
      {canEditAccess ? (
        <MemberExtrasPanel
          memberId={member.id}
          overrides={memberAccess.overrides}
          effectivePermissions={memberAccess.effectivePermissions}
          roleGrantedKeys={roleGrantedKeys}
          catalog={catalog}
        />
      ) : null}
      <div className="space-y-2 border-t border-border-soft pt-4">
        <h3 className="text-sm font-semibold">{t('team.detail.permissions')}</h3>
        {grantedKeys.size === 0 ? (
          <p className="text-sm text-muted">{t('team.detail.permissions.empty')}</p>
        ) : (
          <ul className="grid max-h-[40vh] gap-2 overflow-y-auto sm:grid-cols-2">
            {[...grantedKeys].sort().map((key) => (
              <li key={key} className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-xs">
                <p className="font-medium text-foreground">{humanizeKey(key)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
