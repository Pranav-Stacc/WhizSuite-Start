import {
  DEFAULT_MEMBERSHIP_ROLES,
  OWNER_MEMBERSHIP_ROLE,
  RoleKinds,
  ScopeTypes,
  type AccessRoleSummary,
  type MembershipType,
} from '@agency-os/contracts';

/** Stable ids for demo roles; live mode uses API ids. Only Owner is a system role. */
export const DEMO_ROLE_IDS: Record<MembershipType, string> = {
  OWNER: 'role-owner',
  ADMIN: 'role-manager',
  MEMBER: 'role-creator',
  CLIENT: 'role-client',
};

export function demoSystemRole(type: MembershipType): AccessRoleSummary {
  const template = DEFAULT_MEMBERSHIP_ROLES[type];
  return {
    id: DEMO_ROLE_IDS[type],
    name: template.name,
    isSystem: type === 'OWNER',
    kind: template.kind ?? RoleKinds.ACCESS,
    defaultScopeTypes: [...(template.defaultScopeTypes ?? [ScopeTypes.ORGANIZATION])],
  };
}

/** The owner role is never granted or taken away from the team screen. */
export function isOwnerRole(role: AccessRoleSummary): boolean {
  return role.isSystem && role.name === OWNER_MEMBERSHIP_ROLE.name;
}
