import type { MembershipType } from '@agency-os/contracts';

export { DEFAULT_MEMBERSHIP_ROLES } from '@agency-os/contracts';

export type InvitableMembershipType = Exclude<MembershipType, 'OWNER'>;

export const INVITABLE_MEMBERSHIP_TYPES: readonly InvitableMembershipType[] = [
  'ADMIN',
  'MEMBER',
  'CLIENT',
];

/** Agency staff membership types an owner can switch a member between. */
export const STAFF_MEMBERSHIP_TYPES = ['ADMIN', 'MEMBER'] as const;
export type StaffMembershipType = (typeof STAFF_MEMBERSHIP_TYPES)[number];
