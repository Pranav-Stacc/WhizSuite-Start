/** URL path segments that carry one module's data, mapped to permission key prefixes. */
const SEGMENT_PREFIX: Record<string, string> = {
  content: 'content',
  campaigns: 'content',
  'social-accounts': 'social',
  platforms: 'social',
  approvals: 'approvals',
  projects: 'projects',
  tasks: 'tasks',
  clients: 'clients',
  leads: 'leads',
  media: 'files',
  workspaces: 'workspaces',
  calendar: 'calendar',
  invoices: 'invoices',
  contracts: 'invoices',
  reports: 'reports',
  analytics: 'reports',
  chat: 'chat',
  feedback: 'feedback',
  time: 'time',
  members: 'members',
  roles: 'roles',
  'audit-logs': 'audit',
  automations: 'automations',
  integrations: 'integrations',
  workflows: 'workflows',
  agent: 'ai',
  ai: 'ai',
  knowledge: 'org',
  billing: 'org',
  organizations: 'org',
  access: 'org',
  capabilities: 'org',
  designations: 'members',
  departments: 'members',
  teams: 'members',
  search: 'org',
  mcp: 'ai',
};

/**
 * Permission prefix for a request path, so content lists use content grants
 * and project lists use project grants.
 */
export function permissionPrefixForPath(url: string): string | undefined {
  const path = url.split('?')[0] ?? url;
  const segments = path.split('/').filter(Boolean);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const prefix = SEGMENT_PREFIX[segments[index] ?? ''];
    if (prefix) return prefix;
  }
  return undefined;
}
