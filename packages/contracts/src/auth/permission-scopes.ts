import {
  ASSIGNABLE_SCOPE_TYPE_KEYS,
  AssignableScopeTypes,
  type AssignableScopeType,
} from './permissions.js';

/**
 * Scope types that make sense for a permission's module.
 * A content grant can be org-wide, one client, one project, one item, or the actor's own work.
 * A workspace grant stays on the organisation or a workspace.
 */
/** Data-scope options per permission module (permission key prefix). */
export const PERMISSION_MODULE_SCOPES: Record<string, readonly AssignableScopeType[]> = {
  org: [AssignableScopeTypes.ORGANIZATION, AssignableScopeTypes.WORKSPACE],
  roles: [AssignableScopeTypes.ORGANIZATION],
  audit: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.DEPARTMENT,
    AssignableScopeTypes.TEAM,
  ],
  automations: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.WORKSPACE,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
  ],
  integrations: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.WORKSPACE,
    AssignableScopeTypes.CLIENT,
  ],
  workflows: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.WORKSPACE,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
  ],
  content: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.CONTENT,
    AssignableScopeTypes.SELF,
  ],
  social: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.CONTENT,
  ],
  approvals: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.CONTENT,
  ],
  feedback: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.CONTENT,
    AssignableScopeTypes.SELF,
  ],
  projects: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.DEPARTMENT,
    AssignableScopeTypes.TEAM,
  ],
  tasks: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.TASK,
    AssignableScopeTypes.TEAM,
    AssignableScopeTypes.SELF,
  ],
  files: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.WORKSPACE,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
  ],
  clients: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.DEPARTMENT,
    AssignableScopeTypes.TEAM,
  ],
  leads: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.TEAM,
    AssignableScopeTypes.SELF,
  ],
  workspaces: [AssignableScopeTypes.ORGANIZATION, AssignableScopeTypes.WORKSPACE],
  calendar: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.SELF,
  ],
  chat: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.TEAM,
    AssignableScopeTypes.SELF,
  ],
  invoices: [AssignableScopeTypes.ORGANIZATION, AssignableScopeTypes.CLIENT],
  reports: [AssignableScopeTypes.ORGANIZATION, AssignableScopeTypes.CLIENT],
  members: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.DEPARTMENT,
    AssignableScopeTypes.TEAM,
  ],
  time: [
    AssignableScopeTypes.ORGANIZATION,
    AssignableScopeTypes.CLIENT,
    AssignableScopeTypes.PROJECT,
    AssignableScopeTypes.SELF,
  ],
  ai: [AssignableScopeTypes.ORGANIZATION, AssignableScopeTypes.SELF],
};

const MODULE_SCOPES = PERMISSION_MODULE_SCOPES;

const ORGANIZATION_ONLY = [AssignableScopeTypes.ORGANIZATION] as const;

const SCOPE_KEY_SET = new Set<string>(ASSIGNABLE_SCOPE_TYPE_KEYS);

/** Permission prefix before the first dot (`content.create` → `content`). */
export function moduleKeyForPermission(key: string): string {
  const dot = key.indexOf('.');
  return dot === -1 ? key : key.slice(0, dot);
}

/** Scope types a role may attach to this permission. */
export function allowedScopesForPermission(key: string): readonly AssignableScopeType[] {
  return MODULE_SCOPES[moduleKeyForPermission(key)] ?? ORGANIZATION_ONLY;
}

export function isAssignableScopeType(value: string): value is AssignableScopeType {
  return SCOPE_KEY_SET.has(value);
}

/**
 * Scope types stored on `RolePermission.conditions`.
 * `null` means a legacy grant: every scope on the assignment applies.
 */
export function readPermissionScopeTypes(conditions: unknown): AssignableScopeType[] | null {
  if (!conditions || typeof conditions !== 'object') return null;
  const raw = (conditions as { scopeTypes?: unknown }).scopeTypes;
  if (!Array.isArray(raw)) return null;
  const scopes = raw.filter((entry): entry is AssignableScopeType => typeof entry === 'string' && isAssignableScopeType(entry));
  return scopes.length > 0 ? scopes : null;
}

/** Optional per-scope-type resource ids stored on `RolePermission.conditions.resources`. */
export function readPermissionScopeResources(
  conditions: unknown,
): Partial<Record<AssignableScopeType, readonly string[]>> {
  if (!conditions || typeof conditions !== 'object') return {};
  const raw = (conditions as { resources?: unknown }).resources;
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<AssignableScopeType, readonly string[]>> = {};
  for (const [scopeType, ids] of Object.entries(raw)) {
    if (!isAssignableScopeType(scopeType) || !Array.isArray(ids)) continue;
    const resourceIds = ids.filter((id): id is string => typeof id === 'string');
    if (resourceIds.length > 0) out[scopeType] = resourceIds;
  }
  return out;
}
