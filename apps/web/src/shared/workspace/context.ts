import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { env } from '@/shared/config/env';
import { parseWorkspaceHost, type WorkspaceHost } from './host';
import {
  WORKSPACE_MODULE_COOKIE,
  WorkspaceModules,
  type WorkspaceModule,
} from './modules';

function parseModuleCookie(raw: string | undefined): WorkspaceModule | null {
  if (!raw) return null;
  return (WorkspaceModules as readonly string[]).includes(raw) ? (raw as WorkspaceModule) : null;
}

/**
 * Resolves the active product surface for this request.
 * Subdomain wins when APP_ROOT_DOMAIN is set; otherwise the module cookie is used locally.
 */
export const getWorkspaceContext = cache(async (): Promise<WorkspaceHost & { rootDomain: string | null }> => {
  const host = (await headers()).get('host');
  const rootDomain = env.APP_ROOT_DOMAIN || undefined;
  const parsed = parseWorkspaceHost(host, rootDomain);

  if (parsed.subdomainMode) {
    return { ...parsed, rootDomain: rootDomain ?? null };
  }

  const cookieModule = parseModuleCookie((await cookies()).get(WORKSPACE_MODULE_COOKIE)?.value);
  return {
    ...parsed,
    module: cookieModule ?? 'main',
    rootDomain: rootDomain ?? null,
  };
});
