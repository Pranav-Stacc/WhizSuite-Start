import {
  ALL_PERMISSIONS,
  PermissionEffects,
  type MemberPermissionOverride,
  type Permission,
} from '@agency-os/contracts';

export interface PermissionInputs {
  /** ALLOW permissions granted by the member's roles. */
  rolePermissions: Iterable<Permission>;
  overrides: readonly MemberPermissionOverride[];
  /** Owners always hold every permission; overrides never apply to them. */
  isOwner: boolean;
}

const byKey = (a: string, b: string) => a.localeCompare(b);

/** (role permissions ∪ ALLOW overrides) − DENY overrides, sorted; owners get everything. */
export function applyPermissionOverrides({
  rolePermissions,
  overrides,
  isOwner,
}: PermissionInputs): Permission[] {
  if (isOwner) return [...ALL_PERMISSIONS].sort(byKey);
  const granted = new Set<Permission>(rolePermissions);
  for (const override of overrides) {
    if (override.effect === PermissionEffects.ALLOW) granted.add(override.key);
  }
  for (const override of overrides) {
    if (override.effect === PermissionEffects.DENY)
      granted.delete(override.key);
  }
  return [...granted].sort(byKey);
}

export function sortOverrides(
  overrides: readonly MemberPermissionOverride[],
): MemberPermissionOverride[] {
  return [...overrides].sort((a, b) => byKey(a.key, b.key));
}
