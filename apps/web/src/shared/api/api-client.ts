import 'server-only';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { getSession, updateSessionTokens } from '@/shared/auth/session';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  code?: string;
}

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  tags?: string[];
  revalidate?: number;
  token?: string;
  organizationId?: string;
  retries?: number;
  /** Internal: skip one refresh attempt when retrying after rotation. */
  _refreshed?: boolean;
}

const RETRY_DELAY_MS = 200;

function buildUrl(path: string, query?: ApiRequest['query']): string {
  const url = new URL(`${env.API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const response = await fetch(buildUrl('v1/auth/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(env.API_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { accessToken: string; refreshToken: string };
    await updateSessionTokens(body.accessToken, body.refreshToken);
    return body;
  } catch {
    return null;
  }
}

/** Server-only gateway to apps/api. The browser never sees the API URL or tokens. */
export async function apiFetch<T>(path: string, request: ApiRequest = {}): Promise<T> {
  const session = await getSession();
  const token = request.token ?? session?.accessToken;
  const organizationId = request.organizationId ?? session?.orgId;
  const method = request.method ?? 'GET';
  const attempts = (method === 'GET' ? (request.retries ?? 1) : 0) + 1;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(buildUrl(path, request.query), {
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(organizationId ? { 'x-organization-id': organizationId } : {}),
        },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: AbortSignal.timeout(env.API_TIMEOUT_MS),
        ...(method === 'GET' && request.tags
          ? { next: { tags: request.tags, revalidate: request.revalidate ?? 30 } }
          : { cache: 'no-store' as const }),
      });

      if (response.status === 401 && token && session?.refreshToken && !request._refreshed) {
        const rotated = await refreshAccessToken(session.refreshToken);
        if (rotated) return apiFetch<T>(path, { ...request, token: rotated.accessToken, _refreshed: true });
      }
      if (response.status === 401 && token) redirect('/login?expired=1');
      if (!response.ok) {
        const problem = (await response.json().catch(() => ({}))) as ProblemDetails;
        throw new ApiError(response.status, problem.code, problem.detail ?? problem.title ?? response.statusText);
      }
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isRedirect(error)) throw error;
      lastError = error;
      if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * 2 ** attempt));
    }
  }
  throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', lastError instanceof Error ? lastError.message : 'API unavailable');
}

function isRedirect(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'digest' in error && String((error as { digest: unknown }).digest).startsWith('NEXT_REDIRECT');
}
