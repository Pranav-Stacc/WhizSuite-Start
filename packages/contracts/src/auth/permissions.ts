/** Platform permission catalog — agencies compose roles from these keys */
export const Permissions = {
  ORG_VIEW: 'org.view',
  ORG_SETTINGS_MANAGE: 'org.settings.manage',
  ORG_BILLING_MANAGE: 'org.billing.manage',
  ORG_BRANDING_MANAGE: 'org.branding.manage',
  MEMBERS_VIEW: 'members.view',
  MEMBERS_INVITE: 'members.invite',
  MEMBERS_EDIT: 'members.edit',
  MEMBERS_DEACTIVATE: 'members.deactivate',
  ROLES_MANAGE: 'roles.manage',
  WORKSPACES_VIEW: 'workspaces.view',
  WORKSPACES_CREATE: 'workspaces.create',
  WORKSPACES_MANAGE: 'workspaces.manage',
  CLIENTS_VIEW: 'clients.view',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_EDIT: 'clients.edit',
  CLIENTS_DELETE: 'clients.delete',
  LEADS_VIEW: 'leads.view',
  LEADS_CREATE: 'leads.create',
  LEADS_CONVERT: 'leads.convert',
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_EDIT: 'projects.edit',
  PROJECTS_DELETE: 'projects.delete',
  TASKS_VIEW: 'tasks.view',
  TASKS_CREATE: 'tasks.create',
  TASKS_ASSIGN: 'tasks.assign',
  TASKS_EDIT: 'tasks.edit',
  TASKS_DELETE: 'tasks.delete',
  TASKS_TRANSITION: 'tasks.transition',
  CONTENT_VIEW: 'content.view',
  CONTENT_CREATE: 'content.create',
  CONTENT_EDIT: 'content.edit',
  CONTENT_DELETE: 'content.delete',
  CALENDAR_VIEW: 'calendar.view',
  CALENDAR_CREATE: 'calendar.create',
  CALENDAR_EDIT: 'calendar.edit',
  CALENDAR_SYNC: 'calendar.sync',
  SOCIAL_SCHEDULE: 'social.schedule',
  SOCIAL_PUBLISH: 'social.publish',
  APPROVALS_VIEW: 'approvals.view',
  APPROVALS_CREATE: 'approvals.create',
  APPROVALS_APPROVE: 'approvals.approve',
  FEEDBACK_VIEW: 'feedback.view',
  FEEDBACK_CREATE: 'feedback.create',
  FEEDBACK_RESOLVE: 'feedback.resolve',
  FILES_VIEW: 'files.view',
  FILES_UPLOAD: 'files.upload',
  FILES_DELETE: 'files.delete',
  CHAT_VIEW: 'chat.view',
  CHAT_SEND: 'chat.send',
  CHAT_CREATE_ROOM: 'chat.create_room',
  CHAT_MANAGE: 'chat.manage',
  WORKFLOWS_MANAGE: 'workflows.manage',
  AUTOMATIONS_MANAGE: 'automations.manage',
  REPORTS_VIEW: 'reports.view',
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  TIME_TRACK: 'time.track',
  AUDIT_VIEW: 'audit.view',
  INTEGRATIONS_MANAGE: 'integrations.manage',
  AI_VIEW: 'ai.view',
  AI_CHAT: 'ai.chat',
  AI_MANAGE: 'ai.manage',
  AI_AGENTS_MANAGE: 'ai.agents.manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ScopeTypes = {
  GLOBAL: 'GLOBAL',
  ORGANIZATION: 'ORGANIZATION',
  WORKSPACE: 'WORKSPACE',
  DEPARTMENT: 'DEPARTMENT',
  TEAM: 'TEAM',
  CLIENT: 'CLIENT',
  PROJECT: 'PROJECT',
  TASK: 'TASK',
  CONTENT: 'CONTENT',
  SELF: 'SELF',
} as const;

export type ScopeType = (typeof ScopeTypes)[keyof typeof ScopeTypes];

/** Scope types agencies may put on role assignments (excludes platform-only GLOBAL). */
export const AssignableScopeTypes = {
  ORGANIZATION: ScopeTypes.ORGANIZATION,
  WORKSPACE: ScopeTypes.WORKSPACE,
  DEPARTMENT: ScopeTypes.DEPARTMENT,
  TEAM: ScopeTypes.TEAM,
  CLIENT: ScopeTypes.CLIENT,
  PROJECT: ScopeTypes.PROJECT,
  TASK: ScopeTypes.TASK,
  CONTENT: ScopeTypes.CONTENT,
  SELF: ScopeTypes.SELF,
} as const;

export type AssignableScopeType =
  (typeof AssignableScopeTypes)[keyof typeof AssignableScopeTypes];

export const ASSIGNABLE_SCOPE_TYPE_KEYS = Object.values(
  AssignableScopeTypes,
) as [AssignableScopeType, ...AssignableScopeType[]];
