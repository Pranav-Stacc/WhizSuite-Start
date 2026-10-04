import 'server-only';
import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { isLiveMode } from '@/shared/config/env';
import { getSession } from '@/shared/auth/session';
import { auditRepository, type AuditEntry, type AuditOutcome } from '../data/audit.repository';

export interface AuditInput {
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  outcome?: AuditOutcome;
  diff?: AuditEntry['diff'];
}

/**
 * Records an audit entry for a UI-initiated action. In live mode the API's global
 * audit interceptor is the source of truth, so the web tier never double-writes.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  if (isLiveMode) return;
  const session = await getSession();
  const h = await headers();
  await auditRepository.create({
    at: new Date().toISOString(),
    actorId: session?.userId ?? 'anonymous',
    actorName: session?.name ?? 'Anonymous',
    actorType: 'user',
    outcome: 'success',
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1',
    correlationId: h.get('x-correlation-id') ?? randomUUID(),
    ...input,
  });
}

export async function listAudit(): Promise<AuditEntry[]> {
  const rows = await auditRepository.list();
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
