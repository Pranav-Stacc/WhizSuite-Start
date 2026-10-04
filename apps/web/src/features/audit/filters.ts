import type { AuditOutcome } from './data/audit.repository';

export const AUDIT_RANGES = [7, 30, 90] as const;
export type AuditRange = (typeof AUDIT_RANGES)[number] | 'all';

export interface AuditFilter {
  query: string;
  action?: string;
  entityType?: string;
  outcome?: AuditOutcome;
  actorId?: string;
  range: AuditRange;
}

export function parseAuditFilter(get: (key: string) => string | undefined): AuditFilter {
  const rangeRaw = get('range');
  const range = rangeRaw === 'all' ? 'all' : AUDIT_RANGES.find((d) => String(d) === rangeRaw) ?? 30;
  const outcome = get('outcome');
  return {
    query: (get('q') ?? '').trim(),
    action: get('action') || undefined,
    entityType: get('entity') || undefined,
    outcome: outcome === 'success' || outcome === 'failure' ? outcome : undefined,
    actorId: get('actor') || undefined,
    range,
  };
}

export function inRange(at: string, range: AuditRange, now = Date.now()): boolean {
  if (range === 'all') return true;
  const cutoff = now - range * 24 * 60 * 60 * 1000;
  return new Date(at).getTime() >= cutoff;
}
