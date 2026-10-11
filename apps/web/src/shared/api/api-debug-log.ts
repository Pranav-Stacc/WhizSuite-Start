import 'server-only';
import { env } from '@/shared/config/env';

/** Everything needed to tell a connection, auth, permission, validation or backend failure apart. */
export interface ApiCallContext {
  method: string;
  url: string;
  attempt: number;
  durationMs: number;
  status?: number;
  responseBody?: string;
  exception?: string;
}

export function truncateBody(body: string): string {
  const max = env.API_DEBUG_BODY_MAX_CHARS;
  return body.length > max ? `${body.slice(0, max)}…[+${body.length - max} chars]` : body;
}

export function describeException(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? ` (cause: ${error.cause.message})` : '';
  return `${error.name}: ${error.message}${cause}`;
}

export function logApiCall(call: ApiCallContext): void {
  const failed = call.status === undefined || call.status >= 400;
  if (env.API_DEBUG_LOG === 'off' || (env.API_DEBUG_LOG === 'errors' && !failed)) return;
  const line = JSON.stringify({ scope: 'api', ...call });
  if (failed) console.error(line);
  else console.info(line);
}
