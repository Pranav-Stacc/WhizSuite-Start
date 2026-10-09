import {
  Permissions,
  type MembershipType,
  type Permission,
} from '@agency-os/contracts';

export type InvitableMembershipType = Exclude<MembershipType, 'OWNER'>;

export const INVITABLE_MEMBERSHIP_TYPES: readonly InvitableMembershipType[] = [
  'ADMIN',
  'MEMBER',
  'CLIENT',
];

/** Agency staff membership types an owner can switch a member between. */
export const STAFF_MEMBERSHIP_TYPES = ['ADMIN', 'MEMBER'] as const;
export type StaffMembershipType = (typeof STAFF_MEMBERSHIP_TYPES)[number];

interface DefaultRoleTemplate {
  name: string;
  permissions: readonly Permission[];
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

const ADMIN_EXCLUDED = new Set<Permission>([
  Permissions.ORG_BILLING_MANAGE,
  Permissions.ROLES_MANAGE,
  Permissions.MEMBERS_DEACTIVATE,
]);

/** System roles granted on invitation acceptance when the inviter picked no explicit roles. */
export const DEFAULT_MEMBERSHIP_ROLES: Record<
  InvitableMembershipType,
  DefaultRoleTemplate
> = {
  ADMIN: {
    name: 'Manager',
    permissions: Object.values(Permissions).filter(
      (p) => !ADMIN_EXCLUDED.has(p),
    ),
  },
  MEMBER: { name: 'Creator', permissions: STAFF_PERMISSIONS },
  CLIENT: {
    name: 'Client',
    permissions: [
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
    ],
  },
};
