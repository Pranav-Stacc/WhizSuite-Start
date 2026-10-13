import type { MemberAccess } from '@agency-os/contracts';

/**
 * Admin/member detail UI — never use for the signed-in user's nav or route guards.
 * When [liveWithoutAccess] is true and access is missing, returns [] (no role.permissionKeys fallback).
 */
export function memberEffectivePermissionKeys(
  memberAccess: MemberAccess | null | undefined,
  demoRoleGrantedKeys: string[],
  liveWithoutAccess = false,
): readonly string[] {
  if (memberAccess) return memberAccess.effectivePermissions;
  if (liveWithoutAccess) return [];
  return demoRoleGrantedKeys;
}
