import {
  ALL_PERMISSIONS,
  PermissionEffects,
  expandCompanionPermissions,
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

function resolvePermissions(
  { rolePermissions, overrides, isOwner }: PermissionInputs,
  expandCompanions: boolean,
): Permission[] {
  if (isOwner) return [...ALL_PERMISSIONS].sort(byKey);
  const granted = new Set<Permission>(rolePermissions);
  for (const override of overrides) {
    if (override.effect === PermissionEffects.ALLOW) granted.add(override.key);
  }
  if (expandCompanions) {
    for (const companion of expandCompanionPermissions(granted)) {
      granted.add(companion);
    }
  }
  for (const override of overrides) {
    if (override.effect === PermissionEffects.DENY) granted.delete(override.key);
  }
  return [...granted].sort(byKey);
}

/**
 * Explicit grants only — used for nav, member UI, and `GET /v1/access/capabilities`.
 * Does not add companion/supporting permissions.
 */
export function applyExplicitPermissionOverrides(
  inputs: PermissionInputs,
): Permission[] {
  return resolvePermissions(inputs, false);
}

/**
 * Role grants plus companion reads for API authorization (JWT / route guards).
 */
export function applyPermissionOverrides(inputs: PermissionInputs): Permission[] {
  return resolvePermissions(inputs, true);
}

export function sortOverrides(
  overrides: readonly MemberPermissionOverride[],
): MemberPermissionOverride[] {
  return [...overrides].sort((a, b) => byKey(a.key, b.key));
}
