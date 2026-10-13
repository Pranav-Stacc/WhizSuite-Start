import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { Permission } from '@agency-os/contracts';
import { getAccessCapabilities } from './access-capabilities';
import { homeFor } from './roles';
import { resolveSessionPermissions } from './resolve-session-permissions';
import { requireSession, type Session } from './session';

export class ForbiddenError extends Error {
  constructor() {
    super('forbidden');
    this.name = 'ForbiddenError';
  }
}

async function loadPermissions(session: Session): Promise<Permission[]> {
  const access = await getAccessCapabilities();
  return resolveSessionPermissions(session, access);
}

/**
 * Explicit permissions for nav and page guards (from `/v1/access/capabilities`).
 * Companion/supporting keys are not included; the API may still grant those for data routes.
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

/** Server action guard: succeeds when the member holds at least one listed permission. */
export async function authorizeAny(...required: Permission[]): Promise<Session> {
  const session = await requireSession();
  const granted = await getPermissions();
  if (!required.some((permission) => granted.has(permission))) throw new ForbiddenError();
  return session;
}
