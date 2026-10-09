import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UserRole } from '@agency-os/contracts';
import { env } from '@/shared/config/env';

export const SESSION_COOKIE = 'ao_session';

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  orgName: string;
  /** Platform-unique agency slug — powers `{slug}.whizsuite.com` / `crm.{slug}.…`. */
  orgSlug?: string;
  clientId?: string;
  accessToken?: string;
  refreshToken?: string;
  demo: boolean;
}

function sign(payload: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(raw: string): Session | null {
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

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.SESSION_COOKIE_SECURE,
  path: '/',
  maxAge: env.SESSION_TTL_SECONDS,
  ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
};
