import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@agency-os/contracts';
import { env } from '@/shared/config/env';
import { homeFor } from './roles';

export const SESSION_COOKIE = 'ao_session';

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  orgName: string;
  clientId?: string;
  accessToken?: string;
  refreshToken?: string;
  demo: boolean;
}

function sign(payload: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
}

function encode(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string): Session | null {
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
  } catch {
    return null;
  }
}

export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? decode(raw) : null;
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
  store.set(SESSION_COOKIE, encode(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.SESSION_COOKIE_SECURE,
    path: '/',
    maxAge: env.SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Persist rotated tokens after a silent refresh. */
export async function updateSessionTokens(accessToken: string, refreshToken: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await startSession({ ...session, accessToken, refreshToken });
}
