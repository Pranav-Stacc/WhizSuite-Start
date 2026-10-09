/** Product surface for staff apps — maps to subdomain when APP_ROOT_DOMAIN is set. */
export const WorkspaceModules = ['main', 'crm', 'finance'] as const;
export type WorkspaceModule = (typeof WorkspaceModules)[number];

export const WORKSPACE_MODULE_COOKIE = 'ao_workspace_module';

/** Paths that always stay on the current host (auth, legal, portal). */
export const SHARED_PATH_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/invite',
  '/auth',
  '/privacy',
  '/terms',
  '/data-deletion',
  '/portal-access',
  '/portal',
] as const;

/**
 * Which staff app owns a path. Unlisted paths stay on main.
 * CRM = lead gen / pipeline only; converted accounts live on Main as Clients.
 * Finance = money; Main = clients + delivery + agency ops.
 */
const CRM_PREFIXES = ['/leads'] as const;
const FINANCE_PREFIXES = ['/invoices', '/reports', '/time'] as const;

export function moduleForPath(pathname: string): WorkspaceModule {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (CRM_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return 'crm';
  if (FINANCE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return 'finance';
  return 'main';
}

export function isSharedPath(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (path === '/') return true;
  return SHARED_PATH_PREFIXES.some((prefix) => prefix !== '/' && (path === prefix || path.startsWith(`${prefix}/`)));
}

/** Home route after switching into a module. */
export function homePathForModule(module: WorkspaceModule): string {
  switch (module) {
    case 'crm':
      return '/leads';
    case 'finance':
      return '/invoices';
    default:
      return '/dashboard';
  }
}

/** Nav group ids visible on each product surface. */
export const MODULE_NAV_GROUPS: Record<WorkspaceModule, readonly string[]> = {
  main: ['work', 'content', 'clients', 'automate', 'agency'],
  crm: ['clients'],
  finance: ['money', 'work'],
};

/** Primary top-bar hrefs per module. */
export const MODULE_PRIMARY_HREFS: Record<WorkspaceModule, readonly string[]> = {
  // Tasks stay in the Work group / More menu — not the phone bottom dock.
  main: ['/dashboard', '/clients', '/content', '/calendar', '/chat', '/media'],
  crm: ['/leads'],
  finance: ['/invoices', '/reports', '/time'],
};

/** Client workspace tabs — accounts live on Main after CRM conversion; Finance keeps money tabs. */
export const MODULE_CLIENT_SECTIONS: Record<WorkspaceModule, readonly string[]> = {
  main: ['overview', 'brand', 'grid', 'calendar', 'messages', 'assets', 'integrations'],
  crm: [],
  finance: ['overview', 'agreements', 'invoices'],
};
