import { z } from 'zod';
import type { MembershipType } from '../domain/statuses.js';
import { PROFILE_JOB_TITLE_MAX_LENGTH } from './profile.js';
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
  Permissions.CALENDAR_VIEW,
  Permissions.CALENDAR_CREATE,
  Permissions.CALENDAR_EDIT,
  Permissions.APPROVALS_VIEW,
  Permissions.APPROVALS_CREATE,
  Permissions.FEEDBACK_VIEW,
  Permissions.FEEDBACK_CREATE,
  Permissions.FEEDBACK_RESOLVE,
  Permissions.FILES_VIEW,
  Permissions.FILES_UPLOAD,
  Permissions.CHAT_VIEW,
  Permissions.CHAT_SEND,
  Permissions.CHAT_CREATE_ROOM,
  Permissions.TIME_TRACK,
  Permissions.AI_VIEW,
  Permissions.AI_CHAT,
];

const MANAGER_EXCLUDED = new Set<Permission>([
  Permissions.ORG_BILLING_MANAGE,
  Permissions.ROLES_MANAGE,
  Permissions.MEMBERS_DEACTIVATE,
]);

/** Portal clients — view/approve content in their brand; no staff calendar/sync. */
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
  Permissions.CHAT_VIEW,
  Permissions.CHAT_SEND,
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

/** Direct per-member grant or revocation layered on top of the member's role permissions. */
export const PermissionEffects = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
} as const;

export type PermissionEffect = (typeof PermissionEffects)[keyof typeof PermissionEffects];

export const PERMISSION_EFFECT_KEYS = Object.values(PermissionEffects) as [PermissionEffect, ...PermissionEffect[]];

export const MEMBER_PERMISSION_OVERRIDES_MAX = PERMISSION_KEYS.length;
export const MEMBER_DESIGNATIONS_MAX = 10;
export const DESIGNATION_NAME_MAX_LENGTH = 80;

export const memberPermissionOverrideSchema = z.object({
  key: z.enum(PERMISSION_KEYS),
  effect: z.enum(PERMISSION_EFFECT_KEYS),
});
export type MemberPermissionOverride = z.infer<typeof memberPermissionOverrideSchema>;

/** Replaces the member's full set of direct overrides; an empty list clears them. */
export const setMemberPermissionsSchema = z.object({
  overrides: z
    .array(memberPermissionOverrideSchema)
    .max(MEMBER_PERMISSION_OVERRIDES_MAX)
    .refine((items) => new Set(items.map((o) => o.key)).size === items.length, 'Duplicate permission key'),
});
export type SetMemberPermissionsInput = z.infer<typeof setMemberPermissionsSchema>;

/** Response of `GET .../members/:userId/access`. */
export interface MemberAccess {
  roles: AccessRoleSummary[];
  overrides: MemberPermissionOverride[];
  /** (role permissions ∪ ALLOW overrides) − DENY overrides. */
  effectivePermissions: Permission[];
}

/**
 * Replaces the member's full set of department positions. `primaryId` must be one of
 * `designationIds`; when omitted the first id becomes primary.
 */
export const setMemberDesignationsSchema = z
  .object({
    designationIds: z
      .array(z.string().uuid())
      .max(MEMBER_DESIGNATIONS_MAX)
      .refine((ids) => new Set(ids).size === ids.length, 'Duplicate designation id'),
    primaryId: z.string().uuid().nullish(),
  })
  .refine((data) => !data.primaryId || data.designationIds.includes(data.primaryId), {
    path: ['primaryId'],
    message: 'Primary designation must be one of designationIds',
  });
export type SetMemberDesignationsInput = z.infer<typeof setMemberDesignationsSchema>;

/** A department position held by a member, as returned with team members. */
export interface MemberDesignationSummary {
  /** Designation id. */
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  isHead: boolean;
  isPrimary: boolean;
}

/** Admin edit of another member's job title; blank clears it. */
export const updateMemberProfileSchema = z.object({
  title: z
    .string()
    .trim()
    .max(PROFILE_JOB_TITLE_MAX_LENGTH)
    .nullable()
    .transform((value) => value || null),
});
export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>;

export const assignMemberRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1).max(MEMBER_ROLES_MAX),
  /** Applied to every role in this assignment. Defaults to ORGANIZATION when omitted. */
  scopes: z.array(roleAssignmentScopeSchema).min(1).max(ROLE_SCOPES_MAX).optional(),
});
export type AssignMemberRolesInput = z.infer<typeof assignMemberRolesSchema>;
