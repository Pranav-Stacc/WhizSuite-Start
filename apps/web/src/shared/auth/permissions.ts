import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { DEFAULT_MEMBERSHIP_ROLES, isPermission, type AccessCapabilities, type Permission } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { isLiveMode } from '@/shared/config/env';
import { ROLE_TO_MEMBERSHIP, homeFor } from './roles';
import { requireSession, type Session } from './session';

export class ForbiddenError extends Error {
  constructor() {
    super('forbidden');
    this.name = 'ForbiddenError';
  }
}

async function loadPermissions(session: Session): Promise<Permission[]> {
  if (!isLiveMode || session.demo) return [...DEFAULT_MEMBERSHIP_ROLES[ROLE_TO_MEMBERSHIP[session.role]].permissions];
  const access = await apiFetch<AccessCapabilities>('v1/access/capabilities');
  return access.permissions.filter(isPermission);
}

/**
 * What the signed-in member may do, resolved once per request from the same role assignments the API enforces.
 * Never cached across requests, so a role change applies on the next navigation.
 */
export const getPermissions = cache(async (): Promise<ReadonlySet<Permission>> => {
  const session = await requireSession();
  return new Set(await loadPermissions(session));
});

export async function can(...required: Permission[]): Promise<boolean> {
  const granted = await getPermissions();
  return required.every((permission) => granted.has(permission));
}

/** Loads supporting data from another domain only when the member may read it, so a narrower role degrades instead of failing. */
export async function loadIf<T>(permission: Permission, load: () => Promise<T>, fallback: T): Promise<T> {
  return (await can(permission)) ? load() : fallback;
}

/** Page guard: sends the member to their home page when any required permission is missing. */
export async function requirePermission(...required: Permission[]): Promise<Session> {
  const session = await requireSession();
  if (!(await can(...required))) redirect(homeFor(session.role));
  return session;
}

/** Server action guard: rejects the call when any required permission is missing. */
export async function authorize(...required: Permission[]): Promise<Session> {
  const session = await requireSession();
  if (!(await can(...required))) throw new ForbiddenError();
  return session;
}
