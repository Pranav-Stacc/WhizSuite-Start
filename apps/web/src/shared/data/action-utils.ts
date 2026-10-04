import 'server-only';
import type { z, ZodTypeAny } from 'zod';
import { ApiError } from '@/shared/api/api-client';
import { t } from '@/shared/i18n/t';
import { fail, type ActionResult } from './action-result';

type Parsed<S extends ZodTypeAny> = { ok: true; data: z.output<S> } | { ok: false; result: ActionResult<never> };

/** Validates untrusted client input against the shared contract schema. */
export function parseInput<S extends ZodTypeAny>(schema: S, raw: unknown): Parsed<S> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, result: fail(t('toast.invalid'), fieldErrors) };
}

/** Wraps a mutation so thrown errors become typed results instead of crashing the page. */
export async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'digest' in error) throw error;
    if (error instanceof ApiError) return fail(error.message);
    return fail(t('toast.failed'));
  }
}
