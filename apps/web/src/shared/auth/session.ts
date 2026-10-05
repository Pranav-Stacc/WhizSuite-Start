import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@agency-os/contracts';
import { homeFor } from './roles';
import { SESSION_COOKIE, decodeSession, encodeSession, sessionCookieOptions, type Session } from './session-codec';

export { SESSION_COOKIE, type Session };

/** Clears a dead session cookie (which Server Components cannot do) before showing the sign-in page. */
export const SESSION_EXPIRED_PATH = '/auth/expired';

export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : null;
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/** Redirects to the role's own home if the current role is not allowed on this surface. */
export async function requireRole(allowed: UserRole[]): Promise<Session> {
  const session = await requireSession();
  if (!allowed.includes(session.role)) redirect(homeFor(session.role));
  return session;
}

export async function startSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(session), sessionCookieOptions);
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
