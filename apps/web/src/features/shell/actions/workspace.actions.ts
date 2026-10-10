'use server';

import { cookies } from 'next/headers';
import { shareSessionAcrossSubdomains } from '@/shared/auth/session';
import {
  WORKSPACE_MODULE_COOKIE,
  WorkspaceModules,
  type WorkspaceModule,
} from '@/shared/workspace/modules';

/** Persists the local (non-subdomain) product surface preference. */
export async function switchWorkspaceModuleAction(module: WorkspaceModule): Promise<void> {
  if (!(WorkspaceModules as readonly string[]).includes(module)) return;
  const store = await cookies();
  store.set(WORKSPACE_MODULE_COOKIE, module, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  });
}

/**
 * Before hopping to crm-{slug} / finance-{slug}, re-emit ao_session with Domain=.whizsuite.com
 * so a host-only cookie from an older login is upgraded for SSO.
 */
export async function prepareWorkspaceHopAction(): Promise<boolean> {
  return shareSessionAcrossSubdomains();
}
