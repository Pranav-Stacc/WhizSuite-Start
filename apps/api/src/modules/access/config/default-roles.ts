import type { MembershipType } from '@agency-os/contracts';

export {
  DEFAULT_MEMBERSHIP_ROLES,
  DEFAULT_ROLE_TEMPLATES,
  MEMBERSHIP_DEFAULT_ROLE_NAME,
  OWNER_MEMBERSHIP_ROLE,
} from '@agency-os/contracts';

export const OWNER_MEMBERSHIP_TYPE = 'OWNER' satisfies MembershipType;
export const CLIENT_MEMBERSHIP_TYPE = 'CLIENT' satisfies MembershipType;
export const ACTIVE_MEMBERSHIP_STATUS = 'ACTIVE';

export type InvitableMembershipType = Exclude<MembershipType, 'OWNER'>;

export const INVITABLE_MEMBERSHIP_TYPES: readonly InvitableMembershipType[] = [
  'ADMIN',
  'MEMBER',
  'CLIENT',
];

/** Agency staff membership types an owner can switch a member between. */
export const STAFF_MEMBERSHIP_TYPES = ['ADMIN', 'MEMBER'] as const;
export type StaffMembershipType = (typeof STAFF_MEMBERSHIP_TYPES)[number];
