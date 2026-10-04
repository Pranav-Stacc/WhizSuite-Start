'use server';

import { UserRoles, inviteMemberSchema } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_LEADERSHIP, ROLES_OWNER } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { inviteMember } from '@/shared/api/live/mutations';
import { isLiveMode } from '@/shared/config/env';
import { recordAudit } from '@/features/audit/services/audit.service';
import { ASSIGNABLE_ROLES, DEFAULT_INVITE_CAPACITY_HOURS, ROLE_FOR_MEMBERSHIP } from '../config';
import { membersRepository, type MemberRole } from '../data/members.repository';

async function authorize(allowed: readonly string[]) {
  const session = await requireSession();
  if (!allowed.includes(session.role)) throw new Error('forbidden');
  return session;
}

export async function inviteMemberAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(ROLES_LEADERSHIP);
    const parsed = parseInput(inviteMemberSchema, raw);
    if (!parsed.ok) return parsed.result;
    const { email, membershipType, note } = parsed.data;
    const role = ROLE_FOR_MEMBERSHIP[membershipType];
    if (!role) return fail(t('toast.failed'), { membershipType: 'validation.required' });
    const normalized = email.toLowerCase();
    if ((await membersRepository.list()).some((m) => m.email.toLowerCase() === normalized)) return fail(t('team.invite.duplicate'), { email: 'team.invite.duplicate' });

    let member;
    if (isLiveMode) {
      await inviteMember(normalized, membershipType);
      member = {
        id: normalized,
        name: normalized,
        email: normalized,
        role,
        title: note ?? '',
        capacityHours: DEFAULT_INVITE_CAPACITY_HOURS,
        skills: [],
        status: 'INVITED' as const,
        joinedAt: new Date().toISOString(),
      };
    } else {
      member = await membersRepository.create({
        name: normalized,
        email: normalized,
        role,
        title: note ?? '',
        capacityHours: DEFAULT_INVITE_CAPACITY_HOURS,
        skills: [],
        status: 'INVITED',
        joinedAt: new Date().toISOString(),
      });
    }
    await recordAudit({ action: 'member.invited', entityType: 'member', entityId: member.id, entityLabel: member.email, summary: 'Invited team member' });
    await refreshData('team');
    return succeed(undefined, t('team.invited', { email: member.email }));
  });
}

export async function changeMemberRoleAction(id: string, role: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(ROLES_OWNER);
    if (!ASSIGNABLE_ROLES.some((r) => r === role)) return fail(t('toast.failed'));
    const before = await membersRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (before.role === UserRoles.OWNER || before.id === session.userId) return fail(t('team.role.protected'));
    await membersRepository.update(id, { role: role as MemberRole });
    await recordAudit({
      action: 'member.role_changed',
      entityType: 'member',
      entityId: id,
      entityLabel: before.name,
      summary: `Changed role to ${t(`shell.role.${role as MemberRole}`)}`,
      diff: { role: { from: before.role, to: role } },
    });
    await refreshData('team');
    return succeed(undefined, t('team.role.updated'));
  });
}

export async function removeMemberAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(ROLES_OWNER);
    const before = await membersRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (before.role === UserRoles.OWNER || before.id === session.userId) return fail(t('team.remove.protected'));
    await membersRepository.remove(id);
    await recordAudit({
      action: before.status === 'INVITED' ? 'member.invite_revoked' : 'member.removed',
      entityType: 'member',
      entityId: id,
      entityLabel: before.name,
      summary: before.status === 'INVITED' ? 'Revoked invitation' : 'Removed team member',
    });
    await refreshData('team', 'tasks');
    return succeed(undefined, before.status === 'INVITED' ? t('team.invite.revoked') : t('team.removed'));
  });
}
