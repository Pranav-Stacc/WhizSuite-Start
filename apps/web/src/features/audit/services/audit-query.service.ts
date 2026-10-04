import 'server-only';
import { listAudit } from './audit.service';
import { inRange, type AuditFilter } from '../filters';
import type { AuditEntry } from '../data/audit.repository';

export async function filterAudit(filter: AuditFilter): Promise<AuditEntry[]> {
  const query = filter.query.toLowerCase();
  const rows = await listAudit();
  return rows.filter((entry) => {
    if (!inRange(entry.at, filter.range)) return false;
    if (filter.action && entry.action !== filter.action) return false;
    if (filter.entityType && entry.entityType !== filter.entityType) return false;
    if (filter.outcome && entry.outcome !== filter.outcome) return false;
    if (filter.actorId && entry.actorId !== filter.actorId) return false;
    if (!query) return true;
    const haystack = `${entry.actorName} ${entry.action} ${entry.entityType} ${entry.entityLabel} ${entry.summary}`.toLowerCase();
    return haystack.includes(query);
  });
}

export async function auditFacets(): Promise<{ actions: string[]; entityTypes: string[]; actors: Array<{ id: string; name: string }> }> {
  const rows = await listAudit();
  const actions = [...new Set(rows.map((r) => r.action))].sort();
  const entityTypes = [...new Set(rows.map((r) => r.entityType))].sort();
  const actorMap = new Map<string, string>();
  for (const row of rows) actorMap.set(row.actorId, row.actorName);
  const actors = [...actorMap.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  return { actions, entityTypes, actors };
}
