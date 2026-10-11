import 'server-only';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { SESSION_EXPIRED_PATH, getSession } from '@/shared/auth/session';
import { describeException, logApiCall, truncateBody, type ApiCallContext } from './api-debug-log';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    /** The failing call (URL, method, status, body, duration) — inspect this when debugging. */
    public readonly call?: ApiCallContext,
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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  tags?: string[];
  revalidate?: number;
  token?: string;
  organizationId?: string;
  retries?: number;
  /** Override default API timeout (ms). Use for long agent runs. */
  timeoutMs?: number;
}

const RETRY_DELAY_MS = 200;
/** Credential endpoints answer 401 for bad input, not for a dead session. */
const CREDENTIAL_API_PREFIXES = ['v1/auth/', 'v1/invitations/', 'v1/portal-access/'];

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
  const normalizedPath = path.replace(/^\//, '');
  const credentialRoute = CREDENTIAL_API_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
  const token = request.token ?? (credentialRoute ? undefined : session?.accessToken);
  const organizationId = request.organizationId ?? (credentialRoute ? undefined : session?.orgId);
  const method = request.method ?? 'GET';
  const sessionBound = Boolean(token ?? session) && !credentialRoute;
  const attempts = (method === 'GET' ? (request.retries ?? 1) : 0) + 1;

  const url = buildUrl(path, request.query);
  let lastCall: ApiCallContext | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const startedAt = performance.now();
    const elapsed = () => Math.round(performance.now() - startedAt);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(organizationId ? { 'x-organization-id': organizationId } : {}),
        },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: AbortSignal.timeout(request.timeoutMs ?? env.API_TIMEOUT_MS),
        ...(method === 'GET' && request.tags && request.tags.length > 0
          ? { next: { tags: request.tags, revalidate: request.revalidate ?? 30 } }
          : { cache: 'no-store' as const }),
      });

      const bodyText = response.status === 204 ? '' : await response.text();
      const call: ApiCallContext = { method, url, attempt: attempt + 1, durationMs: elapsed(), status: response.status };
      if (!response.ok) call.responseBody = truncateBody(bodyText);
      logApiCall(call);

      if (response.status === 401 && sessionBound) redirect(SESSION_EXPIRED_PATH);
      if (!response.ok) {
        const problem = parseProblem(bodyText);
        throw new ApiError(response.status, problem.code, problem.detail ?? problem.title ?? response.statusText, call);
      }
      if (!bodyText.trim()) return undefined as T;
      return JSON.parse(bodyText) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isRedirect(error)) throw error;
      lastCall = { method, url, attempt: attempt + 1, durationMs: elapsed(), exception: describeException(error) };
      logApiCall(lastCall);
      if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * 2 ** attempt));
    }
  }
  throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', lastCall?.exception ?? 'API unavailable', lastCall);
}

function parseProblem(bodyText: string): ProblemDetails {
  try {
    return JSON.parse(bodyText) as ProblemDetails;
  } catch {
    return {};
  }
}

function isRedirect(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'digest' in error && String((error as { digest: unknown }).digest).startsWith('NEXT_REDIRECT');
}
