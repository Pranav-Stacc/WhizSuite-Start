'use server';

import { cookies } from 'next/headers';
import { Permissions, workspacesCreateInput } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { TENANCY_WORKSPACE_COOKIE, listTenancyWorkspaces } from '@/shared/api/live/workspace';
import { orgPath } from '@/shared/api/live/utils';
import { authorize } from '@/shared/auth/permissions';
import { getSession } from '@/shared/auth/session';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';

function cookieValue(orgId: string, workspaceId: string): string {
  return `${orgId}:${workspaceId}`;
}

export async function switchTenancyWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.WORKSPACES_VIEW);
    const session = await getSession();
    if (!session?.orgId) return fail(t('auth.login.invalid'));
    const workspaces = await listTenancyWorkspaces();
    if (!workspaces.some((w) => w.id === workspaceId)) return fail(t('orgWorkspace.invalid'));
    const store = await cookies();
    store.set(TENANCY_WORKSPACE_COOKIE, cookieValue(session.orgId, workspaceId), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    });
    await refreshData('workspaces', 'clients');
    return succeed(undefined, t('orgWorkspace.switched'));
  });
}

export async function createTenancyWorkspaceAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await authorize(Permissions.WORKSPACES_CREATE);
    const parsed = workspacesCreateInput.safeParse(raw);
    if (!parsed.success) return fail(t('validation.required'));
    const session = await getSession();
    if (!session?.orgId) return fail(t('auth.login.invalid'));
    const row = await apiFetch<{ id: string }>(orgPath(session.orgId, 'workspaces'), {
      method: 'POST',
      body: parsed.data,
    });
    const store = await cookies();
    store.set(TENANCY_WORKSPACE_COOKIE, cookieValue(session.orgId, row.id), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    });
    await refreshData('workspaces', 'clients');
    return succeed({ id: row.id }, t('orgWorkspace.created'));
  });
}
