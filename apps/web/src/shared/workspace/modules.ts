/** Product surface for staff apps — maps to subdomain when APP_ROOT_DOMAIN is set. */
export const WorkspaceModules = ['main', 'crm'] as const;
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
 * Finance (invoices, reports, time) lives on Main — only CRM is a separate surface.
 */
const CRM_PREFIXES = ['/leads'] as const;

export function moduleForPath(pathname: string): WorkspaceModule {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (CRM_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return 'crm';
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
    default:
      return '/dashboard';
  }
}

/** Nav group ids visible on each product surface. */
export const MODULE_NAV_GROUPS: Record<WorkspaceModule, readonly string[]> = {
  main: ['work', 'content', 'clients', 'money', 'automate', 'agency'],
  crm: ['clients'],
};

/** Primary top-bar hrefs per module. */
export const MODULE_PRIMARY_HREFS: Record<WorkspaceModule, readonly string[]> = {
  // Tasks stay in the Work group / More menu — not the phone bottom dock.
  // Agency (/team) replaces Assets (/media) on the primary bar; media stays under Content → More.
  main: ['/dashboard', '/clients', '/content', '/calendar', '/chat', '/chat?whiz=1', '/team'],
  crm: ['/leads'],
};

/** Client workspace tabs — accounts + finance tabs live on Main after CRM conversion. */
export const MODULE_CLIENT_SECTIONS: Record<WorkspaceModule, readonly string[]> = {
  main: ['overview', 'brand', 'grid', 'calendar', 'messages', 'assets', 'agreements', 'invoices', 'integrations'],
  crm: [],
};
