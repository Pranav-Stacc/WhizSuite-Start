'use server';

import {
  UserRoles,
  assignMemberRolesSchema,
  createPortalAccessLinkSchema,
  inviteMemberSchema,
  setMemberPermissionsSchema,
  invitePortalUserSchema,
  RoleKinds,
  isPermission,
  type AccessRoleSummary,
  type MembershipType,
  type Permission,
  Permissions,
} from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import type { FormDialogResult } from '@/shared/forms/form-dialog';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import {
  assignMemberRoles,
  changeMembershipType,
  createPortalAccessLink,
  deactivateMember,
  inviteMember,
  revokeInvitation,
  setMemberPermissions,
} from '@/shared/api/live/mutations';
import { isLiveMode } from '@/shared/config/env';
import { recordAudit } from '@/features/audit/services/audit.service';
import { demoSystemRole, isOwnerRole } from '@/features/roles/config';
import { rolesRepository } from '@/features/roles/data/roles.repository';
import { listRoles, toRoleSummary } from '@/features/roles/services/roles.service';
import {
  ASSIGNABLE_ROLES,
  DEFAULT_WEEKLY_CAPACITY_HOURS,
  PERSONAL_ACCESS_PREFIX,
  ROLE_FOR_MEMBERSHIP,
} from '../config';
import { membersRepository, type MemberRole } from '../data/members.repository';
import { listMembers, membersById } from '../services/members.service';

const CLIENT_MEMBERSHIP: MembershipType = 'CLIENT';

function personalRoleName(memberName: string): string {
  const trimmed = memberName.trim() || 'member';
  return `${PERSONAL_ACCESS_PREFIX}${trimmed}`.slice(0, 60);
}


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
    const { email, note, roleIds } = parsed.data;
    const membershipType: MembershipType = 'MEMBER';
    const customRoles = await resolveAssignableRoles(roleIds);
    if (!customRoles || customRoles.length === 0) return fail(t('team.roles.invalid'), { roleIds: 'team.roles.required' });
    const normalized = email.toLowerCase();
    // Same email may already be a portal client — staff invite merges access on accept.
    if (
      membershipType !== CLIENT_MEMBERSHIP &&
      (await listMembers()).some((m) => m.email.toLowerCase() === normalized)
    ) {
      return fail(t('team.invite.duplicate'), { email: 'team.invite.duplicate' });
    }

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
          role: ROLE_FOR_MEMBERSHIP[membershipType] ?? UserRoles.CREATOR,
          roles: customRoles,
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

/** Creates a shareable portal link (browser or app) — temporary or permanent access. */
export async function createPortalAccessLinkAction(
  clientId: string,
  raw: unknown,
): Promise<ActionResult<FormDialogResult>> {
  return guarded(async () => {
    await authorize(Permissions.MEMBERS_INVITE);
    const parsed = parseInput(createPortalAccessLinkSchema, raw);
    if (!parsed.ok) return parsed.result;
    if (!isLiveMode) return fail(t('toast.failed'));
    const created = await createPortalAccessLink({
      clientId,
      accessMode: parsed.data.accessMode,
      linkExpiresInHours: parsed.data.linkExpiresInHours,
      membershipTtlHours: parsed.data.membershipTtlHours,
      maxUses: parsed.data.maxUses,
      allowedDomains: parsed.data.allowedDomains,
    });
    await recordAudit({
      action: 'portal_access_link.created',
      entityType: 'client',
      entityId: clientId,
      entityLabel: created.accessMode,
      summary: 'Created shareable client portal access link',
    });
    await refreshData('team', 'portal');
    return succeed({ shareLink: created.shareUrl }, t('team.portalLink.created'));
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
      await assignMemberRoles(id, roles.map((role) => role.id));
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
    await refreshData('team', 'roles', 'access');
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

/** Replaces direct ALLOW/DENY overrides layered on the member's roles. */
export async function setMemberPermissionOverridesAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.ROLES_MANAGE);
    const parsed = parseInput(setMemberPermissionsSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = (await membersById()).get(id);
    if (!before || before.status === 'INVITED') return fail(t('toast.failed'));
    if (before.role === UserRoles.OWNER || before.id === session.userId) return fail(t('team.role.protected'));
    if (isLiveMode) {
      await setMemberPermissions(id, parsed.data.overrides);
    }
    await recordAudit({
      action: 'member.permissions_overridden',
      entityType: 'member',
      entityId: id,
      entityLabel: before.name,
      summary: 'Updated permission overrides',
    });
    await refreshData('team', 'roles', 'access');
    return succeed(undefined, t('team.detail.extras.saved'));
  });
}

/**
 * Creates/updates a personal extras role for the member and assigns it alongside their other roles.
 * Locked (role-granted) permissions are left alone; only the extras set is rewritten.
 */
export async function syncMemberExtraPermissionsAction(
  id: string,
  raw: { memberName: string; roleIds: string[]; permissionKeys: string[] },
): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.ROLES_MANAGE);
    const before = (await membersById()).get(id);
    if (!before || before.status === 'INVITED') return fail(t('toast.failed'));
    if (before.role === UserRoles.OWNER || before.id === session.userId) return fail(t('team.role.protected'));

    const permissionKeys = [...new Set(raw.permissionKeys)].filter(isPermission) as Permission[];
    const name = personalRoleName(raw.memberName);
    const allRoles = await listRoles();
    let personal = allRoles.find((role) => !role.isSystem && role.name === name);

    if (permissionKeys.length === 0) {
      const keepIds = raw.roleIds.filter((roleId) => roleId !== personal?.id);
      const roles = await resolveAssignableRoles(keepIds);
      if (!roles) return fail(t('team.roles.invalid'));
      if (isLiveMode) await assignMemberRoles(id, roles.map((role) => role.id));
      else await membersRepository.update(id, { roles });
      if (personal && personal.memberCount <= 1) {
        try {
          await rolesRepository.remove(personal.id);
        } catch {
          /* role may still be referenced elsewhere */
        }
      }
    } else if (personal) {
      await rolesRepository.update(personal.id, {
        permissionKeys,
        kind: RoleKinds.ACCESS,
        defaultScopeTypes: personal.defaultScopeTypes,
      });
      const keepIds = [...new Set([...raw.roleIds.filter((roleId) => roleId !== personal!.id), personal.id])];
      const roles = await resolveAssignableRoles(keepIds);
      if (!roles) return fail(t('team.roles.invalid'));
      if (isLiveMode) await assignMemberRoles(id, roles.map((role) => role.id));
      else await membersRepository.update(id, { roles });
    } else {
      personal = await rolesRepository.create({
        name,
        description: t('team.detail.extras.roleDesc', { name: raw.memberName }),
        isSystem: false,
        kind: RoleKinds.ACCESS,
        defaultScopeTypes: ['ORGANIZATION'],
        permissionKeys,
        permissionScopes: [],
        memberCount: 1,
      });
      const keepIds = [...new Set([...raw.roleIds, personal.id])];
      const roles = await resolveAssignableRoles(keepIds);
      if (!roles) return fail(t('team.roles.invalid'));
      if (isLiveMode) await assignMemberRoles(id, roles.map((role) => role.id));
      else await membersRepository.update(id, { roles });
    }

    await recordAudit({
      action: 'member.extras_updated',
      entityType: 'member',
      entityId: id,
      entityLabel: before.name,
      summary: 'Updated individual extra permissions',
      diff: { permissions: { to: permissionKeys.join(', ') } },
    });
    await refreshData('team', 'roles', 'access');
    return succeed(undefined, t('team.detail.extras.saved'));
  });
}
