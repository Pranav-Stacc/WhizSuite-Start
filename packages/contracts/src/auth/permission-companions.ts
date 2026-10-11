import { moduleKeyForPermission } from './permission-scopes.js';
import { Permissions, type Permission } from './permissions.js';

const PERMISSION_SET = new Set<string>(Object.values(Permissions));

/**
 * Optional supporting permissions a grant needs to work in the product.
 * They inherit the same data scope as the source key and can be denied explicitly.
 *
 * Example: `content.edit` still needs client names and attached files, so
 * `clients.view` and `files.view` travel with it unless DENY'd.
 */
export const PERMISSION_COMPANIONS: Partial<Record<Permission, readonly Permission[]>> = {
  [Permissions.CONTENT_VIEW]: [
    Permissions.CLIENTS_VIEW,
    Permissions.FILES_VIEW,
    Permissions.FEEDBACK_VIEW,
  ],
  [Permissions.CONTENT_EDIT]: [
    Permissions.CONTENT_VIEW,
    Permissions.CLIENTS_VIEW,
    Permissions.FILES_VIEW,
    Permissions.FEEDBACK_VIEW,
    Permissions.FEEDBACK_CREATE,
  ],
  [Permissions.CONTENT_CREATE]: [
    Permissions.CONTENT_VIEW,
    Permissions.CLIENTS_VIEW,
    Permissions.FILES_VIEW,
    Permissions.FILES_UPLOAD,
  ],
  [Permissions.CONTENT_DELETE]: [Permissions.CONTENT_VIEW],
  [Permissions.CLIENTS_CREATE]: [Permissions.CLIENTS_VIEW],
  [Permissions.CLIENTS_EDIT]: [Permissions.CLIENTS_VIEW],
  [Permissions.CLIENTS_DELETE]: [Permissions.CLIENTS_VIEW],
  [Permissions.LEADS_CREATE]: [Permissions.LEADS_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.PROJECTS_DELETE]: [Permissions.PROJECTS_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.TASKS_DELETE]: [Permissions.TASKS_VIEW],
  [Permissions.TASKS_TRANSITION]: [Permissions.TASKS_VIEW],
  [Permissions.CALENDAR_SYNC]: [Permissions.CALENDAR_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.FILES_DELETE]: [Permissions.FILES_VIEW],
  [Permissions.FEEDBACK_RESOLVE]: [Permissions.FEEDBACK_VIEW, Permissions.CONTENT_VIEW],
  [Permissions.WORKSPACES_CREATE]: [Permissions.WORKSPACES_VIEW],
  [Permissions.WORKSPACES_MANAGE]: [Permissions.WORKSPACES_VIEW],
  [Permissions.CHAT_MANAGE]: [Permissions.CHAT_VIEW, Permissions.MEMBERS_VIEW],
  [Permissions.AI_AGENTS_MANAGE]: [Permissions.AI_VIEW],
  [Permissions.ORG_SETTINGS_MANAGE]: [Permissions.ORG_VIEW],
  [Permissions.APPROVALS_VIEW]: [Permissions.CONTENT_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.APPROVALS_CREATE]: [Permissions.APPROVALS_VIEW, Permissions.CONTENT_VIEW],
  [Permissions.APPROVALS_APPROVE]: [Permissions.APPROVALS_VIEW, Permissions.CONTENT_VIEW],
  [Permissions.CALENDAR_VIEW]: [Permissions.CLIENTS_VIEW, Permissions.CONTENT_VIEW],
  [Permissions.CALENDAR_CREATE]: [Permissions.CALENDAR_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.CALENDAR_EDIT]: [Permissions.CALENDAR_VIEW],
  [Permissions.PROJECTS_VIEW]: [Permissions.CLIENTS_VIEW],
  [Permissions.PROJECTS_CREATE]: [Permissions.PROJECTS_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.PROJECTS_EDIT]: [Permissions.PROJECTS_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.TASKS_VIEW]: [Permissions.CLIENTS_VIEW, Permissions.PROJECTS_VIEW],
  [Permissions.TASKS_CREATE]: [Permissions.TASKS_VIEW],
  [Permissions.TASKS_EDIT]: [Permissions.TASKS_VIEW],
  [Permissions.TASKS_ASSIGN]: [Permissions.TASKS_VIEW, Permissions.MEMBERS_VIEW],
  [Permissions.FILES_VIEW]: [Permissions.CLIENTS_VIEW],
  [Permissions.FILES_UPLOAD]: [Permissions.FILES_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.REPORTS_VIEW]: [Permissions.CLIENTS_VIEW],
  [Permissions.INVOICES_VIEW]: [Permissions.CLIENTS_VIEW],
  [Permissions.INVOICES_CREATE]: [Permissions.INVOICES_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.TIME_TRACK]: [Permissions.CLIENTS_VIEW, Permissions.PROJECTS_VIEW],
  [Permissions.FEEDBACK_VIEW]: [Permissions.CONTENT_VIEW],
  [Permissions.FEEDBACK_CREATE]: [Permissions.FEEDBACK_VIEW, Permissions.CONTENT_VIEW],
  [Permissions.LEADS_CONVERT]: [Permissions.LEADS_VIEW, Permissions.CLIENTS_CREATE],
  [Permissions.LEADS_VIEW]: [Permissions.CLIENTS_VIEW],
  [Permissions.CHAT_VIEW]: [Permissions.MEMBERS_VIEW],
  [Permissions.CHAT_SEND]: [Permissions.CHAT_VIEW],
  [Permissions.CHAT_CREATE_ROOM]: [Permissions.CHAT_VIEW, Permissions.MEMBERS_VIEW],
  [Permissions.SOCIAL_SCHEDULE]: [Permissions.CONTENT_VIEW, Permissions.CLIENTS_VIEW],
  [Permissions.SOCIAL_PUBLISH]: [Permissions.SOCIAL_SCHEDULE, Permissions.CONTENT_VIEW],
  [Permissions.INTEGRATIONS_MANAGE]: [Permissions.CLIENTS_VIEW],
  [Permissions.AUTOMATIONS_MANAGE]: [Permissions.CLIENTS_VIEW],
  [Permissions.WORKFLOWS_MANAGE]: [Permissions.CLIENTS_VIEW, Permissions.MEMBERS_VIEW],
  [Permissions.AI_CHAT]: [Permissions.AI_VIEW],
  [Permissions.AI_MANAGE]: [Permissions.AI_VIEW],
  [Permissions.MEMBERS_INVITE]: [Permissions.MEMBERS_VIEW],
  [Permissions.MEMBERS_EDIT]: [Permissions.MEMBERS_VIEW],
  [Permissions.ROLES_MANAGE]: [Permissions.MEMBERS_VIEW],
};

/**
 * When compiling list filters for a route module, also read scope from these
 * modules (so a content-scoped role still filters clients/files/calendar).
 */
export const DATA_SCOPE_SOURCE_MODULES: Record<string, readonly string[]> = {
  files: ['content'],
  clients: ['content', 'calendar', 'projects', 'tasks', 'files', 'invoices', 'reports'],
  feedback: ['content'],
  calendar: ['content'],
  projects: ['content', 'tasks'],
  tasks: ['content', 'projects'],
  approvals: ['content'],
  time: ['projects', 'clients', 'content'],
  chat: ['clients', 'projects'],
  social: ['content', 'clients'],
  integrations: ['clients'],
  automations: ['clients', 'content'],
  workflows: ['clients', 'projects'],
  invoices: ['clients', 'content'],
  reports: ['clients', 'content'],
  leads: ['clients'],
  members: ['clients', 'projects'],
};

/** Adds optional companions; DENY overrides are applied by the caller afterwards. */
export function expandCompanionPermissions(
  granted: Iterable<string>,
): Permission[] {
  const out = new Set<Permission>();
  const queue: Permission[] = [];
  for (const raw of granted) {
    if (!PERMISSION_SET.has(raw)) continue;
    const key = raw as Permission;
    if (out.has(key)) continue;
    out.add(key);
    queue.push(key);
  }
  while (queue.length > 0) {
    const key = queue.pop();
    if (!key) break;
    for (const companion of PERMISSION_COMPANIONS[key] ?? []) {
      if (out.has(companion)) continue;
      out.add(companion);
      queue.push(companion);
    }
  }
  return [...out];
}

export function companionsForPermission(key: Permission): readonly Permission[] {
  return PERMISSION_COMPANIONS[key] ?? [];
}

/** Route module plus modules whose role scopes should apply to that route. */
export function dataScopePrefixesFor(prefix: string): string[] {
  const extras = DATA_SCOPE_SOURCE_MODULES[prefix] ?? [];
  return [prefix, ...extras.filter((module) => module !== prefix)];
}

export function companionModulesForPermission(key: Permission): string[] {
  const modules = new Set<string>();
  for (const companion of companionsForPermission(key)) {
    modules.add(moduleKeyForPermission(companion));
  }
  return [...modules];
}
