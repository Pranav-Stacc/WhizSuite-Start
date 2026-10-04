import { Platforms, type Platform } from '@agency-os/contracts';
import { REPORT_RANGES, type ReportFilter, type ReportRange } from './services/reports.service';

export const DEFAULT_REPORT_RANGE: ReportRange = 30;

/** Builds a validated filter from any key lookup (page search params or a request URL). */
export function parseReportFilter(get: (key: string) => string | undefined): ReportFilter {
  const days = REPORT_RANGES.find((range) => String(range) === get('range')) ?? DEFAULT_REPORT_RANGE;
  const platform = Platforms.find((p): p is Platform => p === get('platform'));
  return { days, platform, clientId: get('client') || undefined };
}
