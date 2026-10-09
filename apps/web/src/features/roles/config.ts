import {
  DEFAULT_MEMBERSHIP_ROLES,
  RoleKinds,
  ScopeTypes,
  type AccessRoleSummary,
  type MembershipType,
} from '@agency-os/contracts';

/** Stable ids for the demo workspace's system roles; live mode uses the API's ids. */
export const DEMO_SYSTEM_ROLE_IDS: Record<MembershipType, string> = {
  OWNER: 'role-owner',
  ADMIN: 'role-manager',
  MEMBER: 'role-creator',
  CLIENT: 'role-client',
};

export function demoSystemRole(type: MembershipType): AccessRoleSummary {
  const template = DEFAULT_MEMBERSHIP_ROLES[type];
  return {
    id: DEMO_SYSTEM_ROLE_IDS[type],
    name: template.name,
    isSystem: true,
    kind: template.kind ?? RoleKinds.ACCESS,
    defaultScopeTypes: [...(template.defaultScopeTypes ?? [ScopeTypes.ORGANIZATION])],
  };
}

/** The owner role is never granted or taken away from the team screen. */
export function isOwnerRole(role: AccessRoleSummary): boolean {
  return role.isSystem && role.name === DEFAULT_MEMBERSHIP_ROLES.OWNER.name;
}
