import type { Metadata } from 'next';
import { Eye, Heart, LineChart, Percent, UserPlus } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatNumber, formatPercent } from '@/shared/lib/format';
import { AreaChart } from '@/shared/ui/charts';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/feedback';
import { PORTAL_REPORT_DAYS, portalReport } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.reports.title') };

export default async function PortalReportsPage() {
  const session = await requireSession();
  const report = await portalReport(session.clientId!);
  const { totals, metrics } = report;
  const hasData = totals.reach > 0 || totals.engagement > 0 || totals.followers > 0;

  return (
    <div>
      <PageHeader title={t('portal.reports.title')} description={t('portal.reports.description')} eyebrow={<LineChart className="inline size-3.5" />} />
      {!hasData ? (
        <Card className="mb-5">
          <EmptyState icon={<LineChart />} title={t('portal.reports.empty.title')} body={t('portal.reports.empty.body')} />
        </Card>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('reports.kpi.reach')} value={formatNumber(totals.reach, true)} icon={<Eye />} hint={t('reports.kpi.reach.hint', { days: PORTAL_REPORT_DAYS })} />
        <StatCard label={t('reports.kpi.engagement')} value={formatNumber(totals.engagement, true)} icon={<Heart />} hint={t('reports.kpi.engagement.hint', { posts: totals.posts })} />
        <StatCard label={t('reports.kpi.rate')} value={formatPercent(totals.engagementRate, 1)} icon={<Percent />} hint={t('reports.kpi.rate.hint')} />
        <StatCard label={t('reports.kpi.followers')} value={formatNumber(totals.followers, true)} icon={<UserPlus />} hint={t('portal.reports.followers.hint')} />
      </div>

      <Card>
        <CardHeader title={t('portal.reports.chart')} />
        <CardBody>
          <AreaChart
            height={260}
            labels={metrics.labels}
            series={[
              { label: t('reports.kpi.reach'), data: metrics.reach },
              { label: t('reports.kpi.engagement'), data: metrics.engagement, color: 'var(--color-info)' },
            ]}
            format={(v) => formatNumber(v, true)}
          />
        </CardBody>
      </Card>
    </div>
  );
}
