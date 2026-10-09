import 'server-only';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { SESSION_EXPIRED_PATH, getSession } from '@/shared/auth/session';

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
}

const RETRY_DELAY_MS = 200;
/** Credential endpoints answer 401 for bad input, not for a dead session. */
const CREDENTIAL_API_PREFIXES = ['v1/auth/', 'v1/invitations/'];

function buildUrl(path: string, query?: ApiRequest['query']): string {
  const url = new URL(`${env.API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Server-only gateway to apps/api. The browser never sees the API URL or tokens.
 * Tokens are rotated ahead of expiry by the proxy; a 401 here means the session is dead.
 */
export async function apiFetch<T>(path: string, request: ApiRequest = {}): Promise<T> {
  const session = await getSession();
  const token = request.token ?? session?.accessToken;
  const organizationId = request.organizationId ?? session?.orgId;
  const method = request.method ?? 'GET';
  const normalizedPath = path.replace(/^\//, '');
  const sessionBound = Boolean(token ?? session) && !CREDENTIAL_API_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
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

      if (response.status === 401 && sessionBound) redirect(SESSION_EXPIRED_PATH);
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
