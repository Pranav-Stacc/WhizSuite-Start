import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { TENANCY_WORKSPACE_UI_ENABLED } from '@/shared/workspace/tenancy-ui';
import { orgPath, unwrapList, str } from './utils';

export const TENANCY_WORKSPACE_COOKIE = 'ao_tenancy_workspace';

export interface TenancyWorkspace {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
}

function workspaceFromRaw(raw: Record<string, unknown>): TenancyWorkspace {
  return {
    id: str(raw, 'id'),
    name: str(raw, 'name'),
    slug: str(raw, 'slug'),
    isDefault: raw.isDefault === true,
  };
}

function cookieValue(orgId: string, workspaceId: string): string {
  return `${orgId}:${workspaceId}`;
}

function parseCookieValue(raw: string | undefined, orgId: string): string | null {
  if (!raw) return null;
  const [cookieOrg, workspaceId] = raw.split(':');
  if (cookieOrg !== orgId || !workspaceId) return null;
  return workspaceId;
}

/** All workspaces in the active organisation (live mode). */
export const listTenancyWorkspaces = cache(async (): Promise<TenancyWorkspace[]> => {
  const session = await getSession();
  if (!session?.orgId) return [];
  const rows = unwrapList(
    await apiFetch(orgPath(session.orgId, 'workspaces'), {
      tags: [`org:${session.orgId}:workspaces`],
    }),
  );
  return rows.map((row) => workspaceFromRaw(row)).filter((w) => w.id.length > 0);
});

/**
 * Active tenancy workspace for creates and client lists.
 * Persisted in a cookie per organisation; falls back to default or first workspace.
 */
export const getActiveWorkspaceId = cache(async (): Promise<string> => {
  const session = await getSession();
  if (!session?.orgId) return '';
  const workspaces = await listTenancyWorkspaces();
  if (workspaces.length === 0) return '';

  if (TENANCY_WORKSPACE_UI_ENABLED) {
    const fromCookie = parseCookieValue((await cookies()).get(TENANCY_WORKSPACE_COOKIE)?.value, session.orgId);
    if (fromCookie && workspaces.some((w) => w.id === fromCookie)) return fromCookie;
  }

  const fallback = workspaces.find((w) => w.isDefault) ?? workspaces[0];
  return fallback?.id ?? '';
});

/** @deprecated Use {@link getActiveWorkspaceId}. */
export const defaultWorkspaceId = getActiveWorkspaceId;
