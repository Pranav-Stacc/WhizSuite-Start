import type { AuditEntry } from '../data/audit.repository';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function auditToCsv(rows: AuditEntry[]): string {
  const header = ['at', 'actor', 'action', 'entityType', 'entityLabel', 'summary', 'outcome', 'ip', 'correlationId'];
  const lines = rows.map((row) =>
    [row.at, row.actorName, row.action, row.entityType, row.entityLabel, row.summary, row.outcome, row.ip, row.correlationId].map((v) => escapeCsv(String(v))).join(','),
  );
  return [header.join(','), ...lines].join('\n');
}
