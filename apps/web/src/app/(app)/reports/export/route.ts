import { Permissions } from '@agency-os/contracts';
import { requirePermission } from '@/shared/auth/permissions';
import { recordAudit } from '@/features/audit/services/audit.service';
import { parseReportFilter } from '@/features/reports/filters';
import { loadReport, metricsToCsv } from '@/features/reports/services/reports.service';

export async function GET(request: Request): Promise<Response> {
  await requirePermission(Permissions.REPORTS_VIEW);
  const params = new URL(request.url).searchParams;
  const filter = parseReportFilter((key) => params.get(key) ?? undefined);
  const report = await loadReport(filter);
  await recordAudit({ action: 'report.exported', entityType: 'report', entityId: `${filter.days}d`, entityLabel: 'Performance report', summary: 'Exported performance report as CSV' });

  return new Response(metricsToCsv(report.metrics), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="report-${filter.days}d.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
