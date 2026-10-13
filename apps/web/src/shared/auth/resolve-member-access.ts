import type { MemberAccess } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';

/**
 * Admin/member detail UI — never use for the signed-in user's nav or route guards.
 * In live mode, only the API effective list is shown (no role.permissionKeys fallback).
 */
export function memberEffectivePermissionKeys(
  memberAccess: MemberAccess | null | undefined,
  demoRoleGrantedKeys: string[],
): readonly string[] {
  if (memberAccess) return memberAccess.effectivePermissions;
  if (isLiveMode) return [];
  return demoRoleGrantedKeys;
}
