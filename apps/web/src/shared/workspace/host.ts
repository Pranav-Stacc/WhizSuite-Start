import { type WorkspaceModule, WorkspaceModules, homePathForModule } from './modules';

export interface WorkspaceHost {
  /** Detected product surface from the hostname (or local cookie fallback). */
  module: WorkspaceModule;
  /** Agency slug from `{slug}.root` / `crm-{slug}.root`. */
  orgSlug: string | null;
  /** True when hostname encodes module + slug (real or *.localhost). */
  subdomainMode: boolean;
  /** Hostname without port. */
  hostname: string;
}

function stripPort(host: string): string {
  return host.split(':')[0]?.toLowerCase() ?? host.toLowerCase();
}

function isModule(value: string): value is WorkspaceModule {
  return (WorkspaceModules as readonly string[]).includes(value);
}

/**
 * Parses agency hosts under APP_ROOT_DOMAIN.
 *
 * Amplify TLS only covers one wildcard level (`*.whizsuite.com`), so product
 * surfaces use a single label:
 * - `{slug}.whizsuite.com` → main
 * - `crm-{slug}.whizsuite.com` → CRM
 * - `finance-{slug}.whizsuite.com` → Finance
 *
 * Nested `crm.{slug}.root` is still accepted if present.
 */
export function parseWorkspaceHost(hostHeader: string | null, rootDomain: string | undefined): WorkspaceHost {
  const hostname = stripPort(hostHeader ?? 'localhost');
  const root = rootDomain?.trim().toLowerCase();

  if (!root) {
    return { module: 'main', orgSlug: null, subdomainMode: false, hostname };
  }

  if (hostname === root || hostname === `www.${root}` || hostname === 'localhost') {
    return { module: 'main', orgSlug: null, subdomainMode: false, hostname };
  }

  const suffix = `.${root}`;
  if (!hostname.endsWith(suffix) && hostname !== root) {
    return { module: 'main', orgSlug: null, subdomainMode: false, hostname };
  }

  const sub = hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : '';
  const parts = sub.split('.').filter(Boolean);

  // Nested: crm.workplace.whizsuite.com
  if (parts.length === 2 && isModule(parts[0]!) && parts[0] !== 'main') {
    return { module: parts[0], orgSlug: parts[1] ?? null, subdomainMode: true, hostname };
  }

  if (parts.length === 1) {
    const label = parts[0] ?? '';
    for (const module of WorkspaceModules) {
      if (module === 'main') continue;
      const prefix = `${module}-`;
      if (label.startsWith(prefix) && label.length > prefix.length) {
        return { module, orgSlug: label.slice(prefix.length), subdomainMode: true, hostname };
      }
    }
    return { module: 'main', orgSlug: label || null, subdomainMode: true, hostname };
  }

  return { module: 'main', orgSlug: parts.at(-1) ?? null, subdomainMode: true, hostname };
}

/** Builds `https://crm-workplace.whizsuite.com/leads` (or http for localhost). */
export function workspaceOrigin(input: {
  module: WorkspaceModule;
  orgSlug: string;
  rootDomain: string;
  protocol?: string;
}): string {
  const protocol = input.protocol ?? (input.rootDomain.includes('localhost') ? 'http' : 'https');
  const host =
    input.module === 'main'
      ? `${input.orgSlug}.${input.rootDomain}`
      : `${input.module}-${input.orgSlug}.${input.rootDomain}`;
  return `${protocol}://${host}`;
}

export function workspaceHref(input: {
  module: WorkspaceModule;
  orgSlug: string;
  rootDomain: string;
  path?: string;
  protocol?: string;
}): string {
  const path = input.path ?? homePathForModule(input.module);
  return `${workspaceOrigin(input)}${path.startsWith('/') ? path : `/${path}`}`;
}
