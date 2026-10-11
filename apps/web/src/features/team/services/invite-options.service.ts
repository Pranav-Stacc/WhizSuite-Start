import 'server-only';
import type { MembershipType } from '@agency-os/contracts';
import { membershipInviteOptions } from '@/shared/auth/member-labels';
import { listRoles } from '@/features/roles/services/roles.service';

function membershipTypeForSystemRole(name: string): MembershipType | null {
  const key = name.trim().toLowerCase();
  if (key === 'owner') return 'OWNER';
  if (key === 'admin') return 'ADMIN';
  if (key === 'member') return 'MEMBER';
  if (key === 'client') return 'CLIENT';
  return null;
}

/** Membership types the invite dialog may offer, with labels from live system roles when available. */
export async function listInviteMembershipOptions(): Promise<Array<{ value: MembershipType; label: string }>> {
  const roles = await listRoles().catch(() => []);
  const systemRoles = roles
    .filter((role) => role.isSystem)
    .map((role) => {
      const membershipType = membershipTypeForSystemRole(role.name);
      return membershipType ? { membershipType, name: role.name } : null;
    })
    .filter((row): row is { membershipType: MembershipType; name: string } => row !== null)
    .filter((row) => row.membershipType === 'MEMBER' || row.membershipType === 'ADMIN');
  return membershipInviteOptions(systemRoles);
}
