import { UserRoles, type MembershipType } from '@agency-os/contracts';
import type { MemberRole } from './data/members.repository';

/** Membership types a leader may invite from the UI, and the workspace role each one grants. */
export const ROLE_FOR_MEMBERSHIP: Partial<Record<MembershipType, MemberRole>> = {
  MEMBER: UserRoles.CREATOR,
  ADMIN: UserRoles.MANAGER,
};

export const INVITABLE_MEMBERSHIPS: MembershipType[] = ['MEMBER', 'ADMIN'];

/** Roles an owner may assign to an existing member. The owner role itself is never reassigned from the UI. */
export const ASSIGNABLE_ROLES: MemberRole[] = [UserRoles.MANAGER, UserRoles.CREATOR];

/** Weekly hours assumed for a member until a per-member capacity is set. */
export const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;
/** Open work above this share of weekly capacity is flagged as overloaded. */
export const OVERLOAD_THRESHOLD = 1;
export const NEAR_CAPACITY_THRESHOLD = 0.8;
