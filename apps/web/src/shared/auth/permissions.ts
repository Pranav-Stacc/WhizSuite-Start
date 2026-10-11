import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { DEFAULT_MEMBERSHIP_ROLES, isPermission, type Permission } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import { getAccessCapabilities } from './access-capabilities';
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
  const access = await getAccessCapabilities();
  if (access?.permissions?.length) return access.permissions.filter(isPermission);
  return [...DEFAULT_MEMBERSHIP_ROLES[ROLE_TO_MEMBERSHIP[session.role]].permissions];
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
  if (!(await can(permission))) return fallback;
  try {
    return await load();
  } catch {
    return fallback;
  }
}

/** Soft-loads data when any of the permissions is granted; never throws into the page. */
export async function loadIfAny<T>(permissions: Permission[], load: () => Promise<T>, fallback: T): Promise<T> {
  const granted = await getPermissions();
  if (!permissions.some((permission) => granted.has(permission))) return fallback;
  try {
    return await load();
  } catch {
    return fallback;
  }
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
