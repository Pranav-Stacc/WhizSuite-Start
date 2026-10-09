'use server';

import {
  UserRoles,
  assignMemberRolesSchema,
  inviteMemberSchema,
  invitePortalUserSchema,
  type AccessRoleSummary,
  type MembershipType,
  Permissions,
} from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import type { FormDialogResult } from '@/shared/forms/form-dialog';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { assignMemberRoles, changeMembershipType, deactivateMember, inviteMember, revokeInvitation } from '@/shared/api/live/mutations';
import { isLiveMode } from '@/shared/config/env';
import { recordAudit } from '@/features/audit/services/audit.service';
import { demoSystemRole, isOwnerRole } from '@/features/roles/config';
import { listRoles, toRoleSummary } from '@/features/roles/services/roles.service';
import { ASSIGNABLE_ROLES, DEFAULT_WEEKLY_CAPACITY_HOURS, ROLE_FOR_MEMBERSHIP } from '../config';
import { membersRepository, type MemberRole } from '../data/members.repository';
import { listMembers, membersById } from '../services/members.service';

const CLIENT_MEMBERSHIP: MembershipType = 'CLIENT';


function membershipFor(role: MemberRole): MembershipType | undefined {
  const entry = Object.entries(ROLE_FOR_MEMBERSHIP).find(([, mapped]) => mapped === role);
  return entry?.[0] as MembershipType | undefined;
}

/** Resolves requested role ids against the workspace; undefined when any is unknown or not grantable. */
async function resolveAssignableRoles(roleIds: readonly string[]): Promise<AccessRoleSummary[] | undefined> {
  if (roleIds.length === 0) return [];
  const byId = new Map((await listRoles()).map((role) => [role.id, toRoleSummary(role)]));
  const resolved = [...new Set(roleIds)].map((id) => byId.get(id));
  if (resolved.some((role) => !role || isOwnerRole(role))) return undefined;
  return resolved.filter((role): role is AccessRoleSummary => role !== undefined);
}

export async function inviteMemberAction(raw: unknown): Promise<ActionResult<FormDialogResult>> {
  return guarded(async () => {
    await authorize(Permissions.MEMBERS_INVITE);
    const parsed = parseInput(inviteMemberSchema, raw);
    if (!parsed.ok) return parsed.result;
    const { email, membershipType, note, roleIds } = parsed.data;
    const role = ROLE_FOR_MEMBERSHIP[membershipType];
    if (!role) return fail(t('toast.failed'), { membershipType: 'validation.required' });
    const customRoles = await resolveAssignableRoles(roleIds);
    if (!customRoles) return fail(t('team.roles.invalid'), { roleIds: 'team.roles.invalid' });
    const normalized = email.toLowerCase();
    if ((await listMembers()).some((m) => m.email.toLowerCase() === normalized)) return fail(t('team.invite.duplicate'), { email: 'team.invite.duplicate' });

    let memberId: string;
    let shareLink: string | undefined;
    if (isLiveMode) {
      const created = await inviteMember(normalized, membershipType, undefined, roleIds);
      memberId = created.invitationId;
      shareLink = created.acceptUrl;
    } else {
      memberId = (
        await membersRepository.create({
          name: normalized,
          email: normalized,
          role,
          roles: customRoles.length ? customRoles : [demoSystemRole(membershipType)],
          title: note ?? '',
          capacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS,
          skills: [],
          status: 'INVITED',
          joinedAt: new Date().toISOString(),
        })
      ).id;
    }
    await recordAudit({ action: 'member.invited', entityType: 'member', entityId: memberId, entityLabel: normalized, summary: 'Invited team member' });
    await refreshData('team');
    return succeed({ shareLink }, t('team.invited', { email: normalized }));
  });
}

/** Gives a client contact access to that client's portal. */
export async function invitePortalUserAction(clientId: string, raw: unknown): Promise<ActionResult<FormDialogResult>> {
  return guarded(async () => {
    await authorize(Permissions.MEMBERS_INVITE);
    const parsed = parseInput(invitePortalUserSchema, raw);
    if (!parsed.ok) return parsed.result;
    const email = parsed.data.email.toLowerCase();
    const shareLink = isLiveMode ? (await inviteMember(email, CLIENT_MEMBERSHIP, clientId)).acceptUrl : undefined;
    await recordAudit({ action: 'member.portal_invited', entityType: 'client', entityId: clientId, entityLabel: email, summary: 'Invited client to the portal' });
    await refreshData('team', 'portal');
    return succeed({ shareLink }, t('team.invited', { email }));
  });
}

export async function changeMemberRoleAction(id: string, role: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.ROLES_MANAGE);
    const nextRole = ASSIGNABLE_ROLES.find((r) => r === role);
    if (!nextRole) return fail(t('toast.failed'));
    const before = (await membersById()).get(id);
    if (!before || before.status === 'INVITED') return fail(t('toast.failed'));
    if (before.role === UserRoles.OWNER || before.id === session.userId) return fail(t('team.role.protected'));
    const membershipType = membershipFor(nextRole);
    if (!membershipType) return fail(t('toast.failed'));
    if (isLiveMode) {
      await changeMembershipType(id, membershipType);
    } else {
      const customRoles = before.roles.filter((role) => !role.isSystem);
      await membersRepository.update(id, { role: nextRole, roles: [demoSystemRole(membershipType), ...customRoles] });
    }
    await recordAudit({
      action: 'member.role_changed',
      entityType: 'member',
      entityId: id,
      entityLabel: before.name,
      summary: `Changed role to ${t(`shell.role.${nextRole}`)}`,
      diff: { role: { from: before.role, to: nextRole } },
    });
    await refreshData('team');
    return succeed(undefined, t('team.role.updated'));
  });
}

/** Replaces the full set of roles a member holds; their membership type is unchanged. */
export async function assignMemberRolesAction(id: string, raw: unknown): Promise<ActionResult<FormDialogResult>> {
  return guarded(async () => {
    const session = await authorize(Permissions.ROLES_MANAGE);
    const parsed = parseInput(assignMemberRolesSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = (await membersById()).get(id);
    if (!before || before.status === 'INVITED') return fail(t('toast.failed'));
    if (before.role === UserRoles.OWNER || before.id === session.userId) return fail(t('team.role.protected'));
    const roles = await resolveAssignableRoles(parsed.data.roleIds);
    if (!roles) return fail(t('team.roles.invalid'), { roleIds: 'team.roles.invalid' });
    if (isLiveMode) {
      await assignMemberRoles(id, roles.map((role) => role.id), parsed.data.scopes);
    } else {
      await membersRepository.update(id, { roles });
    }
    const names = (list: readonly AccessRoleSummary[]) => list.map((role) => role.name).join(', ');
    await recordAudit({
      action: 'member.roles_assigned',
      entityType: 'member',
      entityId: id,
      entityLabel: before.name,
      summary: 'Updated assigned roles',
      diff: { roles: { from: names(before.roles), to: names(roles) } },
    });
    await refreshData('team', 'roles');
    return succeed({}, t('team.roles.updated'));
  });
}

export async function removeMemberAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.MEMBERS_DEACTIVATE);
    const before = (await membersById()).get(id);
    if (!before) return fail(t('toast.failed'));
    if (before.role === UserRoles.OWNER || before.id === session.userId) return fail(t('team.remove.protected'));
    const invited = before.status === 'INVITED';
    if (isLiveMode) {
      await (invited ? revokeInvitation(id) : deactivateMember(id));
    } else {
      await membersRepository.remove(id);
    }
    await recordAudit({
      action: invited ? 'member.invite_revoked' : 'member.removed',
      entityType: 'member',
      entityId: id,
      entityLabel: before.name,
      summary: invited ? 'Revoked invitation' : 'Removed team member',
    });
    await refreshData('team', 'tasks');
    return succeed(undefined, invited ? t('team.invite.revoked') : t('team.removed'));
  });
}
