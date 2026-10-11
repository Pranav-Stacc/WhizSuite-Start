import Link from 'next/link';
import { Clock, Mail, UserMinus } from 'lucide-react';
import { UserRoles, type AccessRoleSummary } from '@agency-os/contracts';
import { memberAccessLabel } from '@/shared/auth/member-labels';
import { t } from '@/shared/i18n/t';
import { formatDate } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge, type BadgeTone } from '@/shared/ui/badge';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { Progress } from '@/shared/ui/feedback';
import { StatusMenu } from '@/shared/ui/status-menu';
import { changeMemberRoleAction, removeMemberAction } from '../actions/member.actions';
import { ASSIGNABLE_ROLES, NEAR_CAPACITY_THRESHOLD, OVERLOAD_THRESHOLD } from '../config';
import type { Member, MemberRole } from '../data/members.repository';
import { AssignRolesDialog } from './assign-roles-dialog';
import type { ScopeResourceOptions } from './scope-resource-fields';

const ROLE_TONE: Record<MemberRole, BadgeTone> = {
  [UserRoles.OWNER]: 'primary',
  [UserRoles.MANAGER]: 'info',
  [UserRoles.CREATOR]: 'neutral',
};

const ROLE_COLOR: Record<MemberRole, string> = {
  [UserRoles.OWNER]: 'var(--color-primary)',
  [UserRoles.MANAGER]: 'var(--color-info)',
  [UserRoles.CREATOR]: 'var(--color-muted)',
};

interface MemberCardProps {
  member: Member;
  openHours: number;
  isSelf: boolean;
  /** Roles the viewer may grant; present only when they hold the role-management permission. */
  assignableRoles?: AccessRoleSummary[];
  scopeResources?: ScopeResourceOptions;
  canRemove: boolean;
}

function workloadTone(ratio: number): 'primary' | 'warning' | 'danger' {
  if (ratio > OVERLOAD_THRESHOLD) return 'danger';
  if (ratio >= NEAR_CAPACITY_THRESHOLD) return 'warning';
  return 'primary';
}

export function MemberCard({ member, openHours, isSelf, assignableRoles, scopeResources, canRemove }: MemberCardProps) {
  const invited = member.status === 'INVITED';
  const ratio = member.capacityHours > 0 ? openHours / member.capacityHours : 0;
  const protectedMember = member.role === UserRoles.OWNER || isSelf;
  const roleLabel = memberAccessLabel(member);
  const canManageRoles = assignableRoles !== undefined && !protectedMember && !invited;
  const showRemove = canRemove && !protectedMember;
  const profileHref = `/team/${member.id}`;

  return (
    <article className="card-surface flex h-full flex-col gap-4 p-5">
      <header className="flex items-start gap-3">
        <Link href={profileHref} className="shrink-0" aria-label={t('team.detail.title')}>
          <Avatar name={member.name} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">
            <Link href={profileHref} className="hover:underline">
              {member.name}
            </Link>
            {isSelf ? <span className="ml-2 text-xs font-normal text-muted">{t('team.you')}</span> : null}
          </h3>
          <p className="truncate text-xs text-muted">{member.title || t('team.noTitle')}</p>
        </div>
        {invited ? <Badge tone="warning">{t('team.status.invited')}</Badge> : <Badge tone={ROLE_TONE[member.role]}>{roleLabel}</Badge>}
      </header>

      <p className="flex items-center gap-1.5 truncate text-xs text-muted">
        <Mail className="size-3.5 shrink-0" />
        <span className="truncate">{member.email}</span>
      </p>

      {invited ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5" />
          {t('team.invitedOn', { date: formatDate(member.joinedAt) })}
        </p>
      ) : (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-muted">{t('team.workload')}</span>
            <span className="font-medium tabular-nums">{t('team.workload.value', { open: openHours, capacity: member.capacityHours })}</span>
          </div>
          <Progress value={ratio * 100} tone={workloadTone(ratio)} />
          {ratio > OVERLOAD_THRESHOLD ? <p className="mt-1.5 text-xs text-danger">{t('team.overloaded')}</p> : null}
        </div>
      )}

      {member.roles.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('team.roles.assigned')}>
          {member.roles.map((role) => (
            <li key={role.id}>
              <Badge tone={role.isSystem ? 'neutral' : 'info'}>{role.name}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {member.skills.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('team.skills')}>
          {member.skills.map((skill) => (
            <li key={skill}>
              <Badge tone="neutral">{skill}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted">{invited ? t('team.pending') : t('team.joined', { date: formatDate(member.joinedAt) })}</span>
        {canManageRoles || showRemove ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canManageRoles && assignableRoles ? (
              <>
                <StatusMenu
                  current={member.role}
                  label={t('team.role.change')}
                  options={ASSIGNABLE_ROLES.map((role) => ({ value: role, label: t(`shell.role.${role}`), color: ROLE_COLOR[role] }))}
                  action={changeMemberRoleAction.bind(null, member.id)}
                />
                {scopeResources ? <AssignRolesDialog member={member} assignable={assignableRoles} resources={scopeResources} /> : null}
              </>
            ) : null}
            {showRemove ? (
              <ConfirmButton
                action={removeMemberAction.bind(null, member.id)}
                label={invited ? t('team.invite.revoke') : t('team.remove')}
                icon={<UserMinus />}
                size="sm"
              />
            ) : null}
          </div>
        ) : null}
      </footer>
    </article>
  );
}
