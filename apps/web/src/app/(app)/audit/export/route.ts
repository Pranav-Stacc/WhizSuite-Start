import { Permissions } from '@agency-os/contracts';
import { requirePermission } from '@/shared/auth/permissions';
import { recordAudit } from '@/features/audit/services/audit.service';
import { parseAuditFilter } from '@/features/audit/filters';
import { auditToCsv } from '@/features/audit/utils/export';
import { filterAudit } from '@/features/audit/services/audit-query.service';

export async function GET(request: Request): Promise<Response> {
  await requirePermission(Permissions.AUDIT_VIEW);
  const params = new URL(request.url).searchParams;
  const filter = parseAuditFilter((key) => params.get(key) ?? undefined);
  const rows = await filterAudit(filter);
  await recordAudit({
    action: 'audit.exported',
    entityType: 'audit',
    entityId: 'export',
    entityLabel: 'Audit log',
    summary: `Exported ${rows.length} audit entries as CSV`,
  });

  return new Response(auditToCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-${filter.range === 'all' ? 'all' : `${filter.range}d`}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
