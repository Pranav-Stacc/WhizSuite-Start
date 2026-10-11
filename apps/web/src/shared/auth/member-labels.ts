import { UserRoles, type AccessRoleSummary, type MembershipType, type UserRole } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import { t, type MessageKey } from '@/shared/i18n/t';
import type { Member, MemberRole } from '@/features/team/data/members.repository';

const ROLE_MESSAGE: Record<UserRole, MessageKey> = {
  [UserRoles.OWNER]: 'shell.role.owner',
  [UserRoles.MANAGER]: 'shell.role.manager',
  [UserRoles.CREATOR]: 'shell.role.creator',
  [UserRoles.CLIENT]: 'shell.role.client',
};

/** Primary badge label for a member — API role names in live mode, i18n persona labels in demo. */
export function memberAccessLabel(member: Pick<Member, 'role' | 'roles'>): string {
  if (isLiveMode && member.roles.length > 0) {
    const names = member.roles.map((role) => role.name).filter(Boolean);
    if (names.length) return names.join(', ');
  }
  return t(ROLE_MESSAGE[member.role]);
}

/** Label for the signed-in member's access line in the shell. */
export function sessionAccessLabel(
  role: UserRole,
  assignedRoles: AccessRoleSummary[] = [],
): string {
  if (isLiveMode && assignedRoles.length > 0) {
    const names = assignedRoles.map((r) => r.name).filter(Boolean);
    if (names.length) return names.join(', ');
  }
  return t(ROLE_MESSAGE[role]);
}

/** Invite / membership picker options — system role names from the API in live mode. */
export function membershipInviteOptions(
  systemRoles: Array<{ membershipType: MembershipType; name: string }>,
): Array<{ value: MembershipType; label: string }> {
  if (!isLiveMode || systemRoles.length === 0) {
    return (['MEMBER', 'ADMIN'] as MembershipType[]).map((value) => ({
      value,
      label: t(`team.access.${value}` as MessageKey),
    }));
  }
  return systemRoles.map((row) => ({ value: row.membershipType, label: row.name }));
}
