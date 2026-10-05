import 'server-only';
import { env } from '@/shared/config/env';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const MS_PER_SECOND = 1000;

/** `rejected`: the session is dead. `unavailable`: transient failure, the current tokens stay. */
export type RotationResult = { status: 'rotated'; tokens: TokenPair } | { status: 'rejected' } | { status: 'unavailable' };

/** Concurrent requests carrying the same refresh token share one rotation (the API revokes on reuse). */
const inFlight = new Map<string, Promise<RotationResult>>();

function accessTokenExpiry(accessToken: string): number | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp?: unknown };
    return typeof exp === 'number' ? exp * MS_PER_SECOND : null;
  } catch {
    return null;
  }
}

export function accessTokenNeedsRefresh(accessToken: string): boolean {
  const expiresAt = accessTokenExpiry(accessToken);
  if (expiresAt === null) return true;
  return expiresAt - env.SESSION_REFRESH_SKEW_SECONDS * MS_PER_SECOND <= Date.now();
}

const HTTP_UNAUTHORIZED = 401;
const HTTP_BAD_REQUEST = 400;

async function requestRotation(refreshToken: string): Promise<RotationResult> {
  try {
    const response = await fetch(`${env.API_BASE_URL.replace(/\/$/, '')}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(env.API_TIMEOUT_MS),
    });
    if (response.status === HTTP_UNAUTHORIZED || response.status === HTTP_BAD_REQUEST) return { status: 'rejected' };
    if (!response.ok) return { status: 'unavailable' };
    const body = (await response.json()) as Partial<TokenPair>;
    if (!body.accessToken || !body.refreshToken) return { status: 'unavailable' };
    return { status: 'rotated', tokens: { accessToken: body.accessToken, refreshToken: body.refreshToken } };
  } catch {
    return { status: 'unavailable' };
  }
}

export function rotateTokens(refreshToken: string): Promise<RotationResult> {
  const pending = inFlight.get(refreshToken);
  if (pending) return pending;
  const rotation = requestRotation(refreshToken);
  inFlight.set(refreshToken, rotation);
  void rotation.finally(() => {
    setTimeout(() => inFlight.delete(refreshToken), env.SESSION_REFRESH_SHARE_MS);
  });
  return rotation;
}
