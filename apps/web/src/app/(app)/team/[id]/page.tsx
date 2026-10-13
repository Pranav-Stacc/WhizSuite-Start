import { Permissions, UserRoles } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Shield, UserMinus } from 'lucide-react';
import { can, loadIf, requirePermission } from '@/shared/auth/permissions';
import { memberEffectivePermissionKeys } from '@/shared/auth/resolve-member-access';
import { t } from '@/shared/i18n/t';
import { formatDate, humanizeKey } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { PageHeader } from '@/shared/ui/page-header';
import { Progress } from '@/shared/ui/feedback';
import { isOwnerRole } from '@/features/roles/config';
import { listPermissionCatalog } from '@/features/roles/services/permissions.service';
import { listRoles, toRoleSummary } from '@/features/roles/services/roles.service';
import { AssignRolesDialog } from '@/features/team/components/assign-roles-dialog';
import { MemberExtrasPanel } from '@/features/team/components/member-extras-panel';
import { MemberRoleScopeSummary } from '@/features/team/components/member-role-scope-summary';
import { loadScopeResources } from '@/features/team/services/scope-resources.service';
import { removeMemberAction } from '@/features/team/actions/member.actions';
import { PERSONAL_ACCESS_PREFIX } from '@/features/team/config';
import { getMember, getMemberAccess } from '@/features/team/services/members.service';
import { MemberProfileTabs } from '@/features/team/components/member-profile-tabs';
import { listTasks, openHoursByAssignee } from '@/features/tasks/services/tasks.service';

export const metadata: Metadata = { title: t('team.detail.title') };

export default async function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission(Permissions.MEMBERS_VIEW);
  const { id } = await params;
  const member = await getMember(id);
  if (!member) notFound();

  const manageRoles = await can(Permissions.ROLES_MANAGE);
  const [canRemove, roles, catalog, tasks, memberAccess, scopeResources] = await Promise.all([
    can(Permissions.MEMBERS_DEACTIVATE),
    loadIf(Permissions.ROLES_MANAGE, listRoles, []),
    loadIf(Permissions.ROLES_MANAGE, listPermissionCatalog, []),
    loadIf(Permissions.TASKS_VIEW, listTasks, []),
    manageRoles && member.status === 'ACTIVE'
      ? getMemberAccess(member.id).catch(() => null)
      : Promise.resolve(null),
    manageRoles ? loadScopeResources().catch(() => null) : Promise.resolve(null),
  ]);

  const assignableRoles = manageRoles ? roles.map(toRoleSummary).filter((role) => !isOwnerRole(role)) : [];
  const roleDetails = roles.filter((role) => member.roles.some((r) => r.id === role.id));
  const personalRole = roleDetails.find((role) => !role.isSystem && role.name.startsWith(PERSONAL_ACCESS_PREFIX));
  const roleGrantedKeys = roleDetails
    .filter((role) => role.id !== personalRole?.id)
    .flatMap((role) => role.permissionKeys);
  const grantedKeys = new Set(
    memberEffectivePermissionKeys(memberAccess, roleGrantedKeys),
  );

  function scopeHintForPermission(key: string): string | undefined {
    for (const role of roleDetails) {
      const row = role.permissionScopes.find((scope) => scope.key === key);
      if (row) {
        const parts = (row.scopeTypes ?? []).map((scope) => humanizeKey(scope));
        const clientScope = row.scopeResources?.find((r) => r.scopeType === 'CLIENT');
        if (clientScope?.resourceIds?.length) {
          parts.push(t('team.detail.permissions.scopedRecords', { count: clientScope.resourceIds.length }));
        }
        return parts.join(' · ');
      }
    }
    const fallback = roleDetails.find((role) => role.permissionKeys.includes(key));
    if (fallback?.defaultScopeTypes.length) {
      return fallback.defaultScopeTypes.map((scope) => humanizeKey(scope)).join(' · ');
    }
    return undefined;
  }
  const hours = openHoursByAssignee(tasks).get(member.id) ?? 0;
  const ratio = member.capacityHours > 0 ? hours / member.capacityHours : 0;
  const isSelf = member.id === session.userId;
  const protectedMember = member.role === UserRoles.OWNER || isSelf;
  const invited = member.status === 'INVITED';
  const canEditAccess = manageRoles && !protectedMember && !invited;

  return (
    <div className="space-y-8">
      <PageHeader
        title={member.name}
        description={member.title || t('team.noTitle')}
        eyebrow={
          <Link href="/team" className="inline-flex items-center gap-1.5 text-muted hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            {t('team.detail.back')}
          </Link>
        }
        actions={
          canRemove && !protectedMember ? (
            <ConfirmButton
              action={removeMemberAction.bind(null, member.id)}
              label={invited ? t('team.invite.revoke') : t('team.remove')}
              icon={<UserMinus />}
            />
          ) : null
        }
      />

      <MemberProfileTabs memberId={member.id} memberName={member.name} tasks={tasks}>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="card-surface space-y-5 p-5">
          <h2 className="text-sm font-semibold">{t('team.detail.info')}</h2>
          <div className="flex items-center gap-4">
            <Avatar name={member.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-medium">
                {member.name}
                {isSelf ? ` · ${t('team.you')}` : ''}
              </p>
              <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted">
                <Mail className="size-3.5 shrink-0" />
                {member.email}
              </p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('team.detail.email')}</dt>
              <dd className="truncate font-medium">{member.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('team.detail.status')}</dt>
              <dd>
                {invited ? (
                  <Badge tone="warning">{t('team.status.invited')}</Badge>
                ) : (
                  <Badge tone="info">{t('team.status.active')}</Badge>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('team.detail.joined')}</dt>
              <dd className="font-medium">{formatDate(member.joinedAt)}</dd>
            </div>
          </dl>
          {!invited ? (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-muted">{t('team.detail.workload')}</span>
                <span className="font-medium tabular-nums">
                  {t('team.workload.value', { open: hours, capacity: member.capacityHours })}
                </span>
              </div>
              <Progress value={ratio * 100} />
            </div>
          ) : null}
          {member.skills.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {member.skills.map((skill) => (
                <li key={skill}>
                  <Badge tone="neutral">{skill}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="card-surface space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Shield className="size-4" />
                {t('team.detail.access')}
              </h2>
              {canEditAccess ? <AssignRolesDialog member={member} assignable={assignableRoles} /> : null}
            </div>
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
            {manageRoles && scopeResources && roleDetails.length > 0 ? (
              <MemberRoleScopeSummary roles={roleDetails} scopeResources={scopeResources} />
            ) : null}
            {canEditAccess && memberAccess ? (
              <MemberExtrasPanel
                memberId={member.id}
                overrides={memberAccess.overrides}
                effectivePermissions={memberAccess.effectivePermissions}
                roleGrantedKeys={roleGrantedKeys}
                catalog={catalog}
              />
            ) : null}
          </div>

          <div className="card-surface space-y-3 p-5">
            <h2 className="text-sm font-semibold">{t('team.detail.permissions')}</h2>
            <p className="text-xs text-muted">{t('team.detail.permissions.scopeHint')}</p>
            {grantedKeys.size === 0 ? (
              <p className="text-sm text-muted">{t('team.detail.permissions.empty')}</p>
            ) : (
              <ul className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">
                {[...grantedKeys].sort().map((key) => {
                  const scopeHint = scopeHintForPermission(key);
                  return (
                    <li key={key} className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-xs">
                      <p className="font-medium text-foreground">{humanizeKey(key)}</p>
                      {scopeHint ? (
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">
                          {t('team.detail.permissions.dataScope')}: {scopeHint}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
      </MemberProfileTabs>
    </div>
  );
}
