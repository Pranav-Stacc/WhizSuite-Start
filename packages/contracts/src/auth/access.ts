import { z } from 'zod';
import type { MembershipType } from '../domain/statuses.js';
import {
  ASSIGNABLE_SCOPE_TYPE_KEYS,
  AssignableScopeTypes,
  Permissions,
  type Permission,
  type ScopeType,
} from './permissions.js';

const PERMISSION_KEYS = Object.values(Permissions) as [Permission, ...Permission[]];

export const ALL_PERMISSIONS: readonly Permission[] = PERMISSION_KEYS;

const PERMISSION_SET = new Set<string>(PERMISSION_KEYS);

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

export const ROLE_NAME_MAX_LENGTH = 60;
export const ROLE_DESCRIPTION_MAX_LENGTH = 280;
export const MEMBER_ROLES_MAX = 10;
export const ROLE_SCOPES_MAX = 20;

/** Access roles grant permissions; workflow roles are assignee pools for workflow stages. */
export const RoleKinds = {
  ACCESS: 'ACCESS',
  WORKFLOW: 'WORKFLOW',
} as const;

export type RoleKind = (typeof RoleKinds)[keyof typeof RoleKinds];

export const ROLE_KIND_KEYS = Object.values(RoleKinds) as [RoleKind, ...RoleKind[]];

export interface DefaultRoleTemplate {
  name: string;
  permissions: readonly Permission[];
  kind?: RoleKind;
  defaultScopeTypes?: readonly ScopeType[];
}

const STAFF_PERMISSIONS: readonly Permission[] = [
  Permissions.ORG_VIEW,
  Permissions.MEMBERS_VIEW,
  Permissions.WORKSPACES_VIEW,
  Permissions.CLIENTS_VIEW,
  Permissions.PROJECTS_VIEW,
  Permissions.TASKS_VIEW,
  Permissions.TASKS_CREATE,
  Permissions.TASKS_EDIT,
  Permissions.TASKS_TRANSITION,
  Permissions.CONTENT_VIEW,
  Permissions.CONTENT_CREATE,
  Permissions.CONTENT_EDIT,
  Permissions.APPROVALS_VIEW,
  Permissions.APPROVALS_CREATE,
  Permissions.FEEDBACK_VIEW,
  Permissions.FEEDBACK_CREATE,
  Permissions.FEEDBACK_RESOLVE,
  Permissions.FILES_VIEW,
  Permissions.FILES_UPLOAD,
  Permissions.INBOX_VIEW,
  Permissions.INBOX_REPLY,
  Permissions.TIME_TRACK,
];

const MANAGER_EXCLUDED = new Set<Permission>([
  Permissions.ORG_BILLING_MANAGE,
  Permissions.ROLES_MANAGE,
  Permissions.MEMBERS_DEACTIVATE,
]);

const CLIENT_PERMISSIONS: readonly Permission[] = [
  Permissions.ORG_VIEW,
  Permissions.CLIENTS_VIEW,
  Permissions.CONTENT_VIEW,
  Permissions.APPROVALS_VIEW,
  Permissions.APPROVALS_APPROVE,
  Permissions.FEEDBACK_VIEW,
  Permissions.FEEDBACK_CREATE,
  Permissions.FILES_VIEW,
  Permissions.INVOICES_VIEW,
  Permissions.REPORTS_VIEW,
];

const ORG_SCOPE = [AssignableScopeTypes.ORGANIZATION] as const;

/** The system role each membership type receives unless custom roles are assigned. */
export const DEFAULT_MEMBERSHIP_ROLES: Record<MembershipType, DefaultRoleTemplate> = {
  OWNER: {
    name: 'Owner',
    permissions: ALL_PERMISSIONS,
    kind: RoleKinds.ACCESS,
    defaultScopeTypes: ORG_SCOPE,
  },
  ADMIN: {
    name: 'Admin',
    permissions: ALL_PERMISSIONS.filter((p) => !MANAGER_EXCLUDED.has(p)),
    kind: RoleKinds.ACCESS,
    defaultScopeTypes: ORG_SCOPE,
  },
  MEMBER: {
    name: 'Member',
    permissions: STAFF_PERMISSIONS,
    kind: RoleKinds.ACCESS,
    defaultScopeTypes: ORG_SCOPE,
  },
  CLIENT: {
    name: 'Client',
    permissions: CLIENT_PERMISSIONS,
    kind: RoleKinds.ACCESS,
    defaultScopeTypes: ORG_SCOPE,
  },
};

export interface AccessRoleSummary {
  id: string;
  name: string;
  isSystem: boolean;
  kind: RoleKind;
  defaultScopeTypes: ScopeType[];
}

/** Response of `GET /v1/access/capabilities`: what the caller may do in the current organisation. */
export interface AccessCapabilities {
  membershipType?: MembershipType;
  permissions: Permission[];
  roles: AccessRoleSummary[];
}

export const roleAssignmentScopeSchema = z.object({
  scopeType: z.enum(ASSIGNABLE_SCOPE_TYPE_KEYS),
  resourceId: z.string().uuid().nullish(),
});
export type RoleAssignmentScopeInput = z.infer<typeof roleAssignmentScopeSchema>;

export const roleInputSchema = z
  .object({
    name: z.string().trim().min(2).max(ROLE_NAME_MAX_LENGTH),
    description: z.string().trim().max(ROLE_DESCRIPTION_MAX_LENGTH).optional(),
    kind: z.enum(ROLE_KIND_KEYS).default(RoleKinds.ACCESS),
    permissionKeys: z.array(z.enum(PERMISSION_KEYS)).default([]),
    defaultScopeTypes: z
      .array(z.enum(ASSIGNABLE_SCOPE_TYPE_KEYS))
      .min(1)
      .max(ROLE_SCOPES_MAX)
      .default([AssignableScopeTypes.ORGANIZATION]),
  })
  .superRefine((data, ctx) => {
    if (data.kind === RoleKinds.ACCESS && data.permissionKeys.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['permissionKeys'],
        message: 'Access roles require at least one permission',
      });
    }
  });
export type RoleInput = z.infer<typeof roleInputSchema>;

export const assignMemberRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1).max(MEMBER_ROLES_MAX),
  /** Applied to every role in this assignment. Defaults to ORGANIZATION when omitted. */
  scopes: z.array(roleAssignmentScopeSchema).min(1).max(ROLE_SCOPES_MAX).optional(),
});
export type AssignMemberRolesInput = z.infer<typeof assignMemberRolesSchema>;
