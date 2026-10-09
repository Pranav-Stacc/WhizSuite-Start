import { Permissions, Platforms } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Download, Eye, Heart, Percent, UserPlus } from 'lucide-react';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { formatDate, formatNumber, formatPercent } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { AreaChart, HBarList } from '@/shared/ui/charts';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { PLATFORM_META, PlatformStack } from '@/shared/ui/platform';
import { StatCard } from '@/shared/ui/stat-card';
import { clientsById } from '@/features/clients/services/clients.service';
import { parseReportFilter } from '@/features/reports/filters';
import { REPORT_RANGES, clientLeaderboard, loadReport } from '@/features/reports/services/reports.service';

export const metadata: Metadata = { title: t('reports.title') };

const BASE = '/reports';
const EXPORT_PATH = '/reports/export';
const TOP_POSTS_LIMIT = 5;

const GUIDE: GuideItem[] = [
  { title: t('reports.guide.range.title'), body: t('reports.guide.range.body') },
  { title: t('reports.guide.filter.title'), body: t('reports.guide.filter.body') },
  { title: t('reports.guide.export.title'), body: t('reports.guide.export.body') },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission(Permissions.REPORTS_VIEW);
  const sp = await searchParams;
  const filter = parseReportFilter((key) => param(sp, key));
  const clients = await clientsById();
  const [report, leaderboard] = await Promise.all([loadReport(filter), filter.clientId ? Promise.resolve([]) : clientLeaderboard(filter, [...clients.keys()])]);
  const { metrics, totals, topPosts, byPlatform } = report;

  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, overrides);
  const exportQuery = new URLSearchParams({ range: String(filter.days), ...(filter.clientId ? { client: filter.clientId } : {}), ...(filter.platform ? { platform: filter.platform } : {}) });
  const hasData = metrics.reach.some((value) => value > 0);
  const scope = filter.clientId ? (clients.get(filter.clientId)?.name ?? t('reports.scope.all')) : t('reports.scope.all');

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        description={t('reports.description', { scope })}
        eyebrow={<BarChart3 className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <Button variant="secondary" asChild>
              <a href={`${EXPORT_PATH}?${exportQuery.toString()}`} download>
                <Download />
                {t('reports.export')}
              </a>
            </Button>
          </>
        }
      />

      <div role="search" aria-label={t('reports.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <FilterChips
          items={REPORT_RANGES.map((days) => ({ href: link({ range: days === 30 ? undefined : String(days) }), label: t('reports.range', { days }), active: filter.days === days }))}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <FilterSelect
            name="platform"
            value={filter.platform}
            label={t('reports.filter.platform')}
            allLabel={t('reports.filter.platform')}
            options={Platforms.map((p) => ({ value: p, label: PLATFORM_META[p].label }))}
          />
          <FilterSelect
            name="client"
            value={filter.clientId}
            label={t('reports.filter.client')}
            allLabel={t('reports.filter.client')}
            options={[...clients.values()].map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
      </div>

      {!hasData ? (
        <div className="card-surface">
          <EmptyState
            icon={<BarChart3 />}
            title={t('reports.empty.title')}
            body={t('reports.empty.body')}
            action={
              <Button variant="secondary" asChild>
                <Link href={filter.clientId || filter.platform ? BASE : '/integrations'}>{filter.clientId || filter.platform ? t('common.clearFilters') : t('reports.empty.connect')}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          <section aria-label={t('reports.kpis')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('reports.kpi.reach')} value={formatNumber(totals.reach, true)} icon={<Eye />} hint={t('reports.kpi.reach.hint', { days: filter.days })} spark={metrics.reach} />
            <StatCard label={t('reports.kpi.engagement')} value={formatNumber(totals.engagement, true)} icon={<Heart />} hint={t('reports.kpi.engagement.hint', { posts: totals.posts })} spark={metrics.engagement} />
            <StatCard label={t('reports.kpi.rate')} value={formatPercent(totals.engagementRate, 1)} icon={<Percent />} hint={t('reports.kpi.rate.hint')} />
            <StatCard label={t('reports.kpi.followers')} value={`${totals.followerGrowth >= 0 ? '+' : ''}${formatNumber(totals.followerGrowth, true)}`} icon={<UserPlus />} hint={t('reports.kpi.followers.hint', { total: formatNumber(totals.followers, true) })} spark={metrics.followers} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title={t('reports.chart.reach')} description={t('reports.chart.reach.desc', { days: filter.days })} />
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
            <Card>
              <CardHeader title={t('reports.platform.title')} description={t('reports.platform.desc')} />
              <CardBody>
                <HBarList format={(v) => formatNumber(v, true)} rows={byPlatform.map((row) => ({ label: PLATFORM_META[row.platform].label, value: row.reach }))} />
              </CardBody>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('reports.top.title')} description={t('reports.top.desc')} />
              <CardBody>
                {topPosts.length === 0 ? (
                  <p className="text-sm text-muted">{t('reports.top.empty')}</p>
                ) : (
                  <ol className="divide-y divide-border-soft">
                    {topPosts.slice(0, TOP_POSTS_LIMIT).map((post, index) => (
                      <li key={post.id}>
                        <Link href={`/content/${post.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{index + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{post.title}</span>
                            <span className="block truncate text-xs text-muted">
                              {clients.get(post.clientId)?.name} · {formatDate(post.updatedAt)}
                            </span>
                          </span>
                          <PlatformStack platforms={post.platforms} size="xs" />
                          <span className="w-20 text-right text-sm tabular-nums">
                            <span className="block font-semibold">{formatNumber(post.engagement, true)}</span>
                            <span className="block text-xs text-muted">{t('reports.top.engagement')}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>

            {filter.clientId ? null : (
              <Card>
                <CardHeader title={t('reports.clients.title')} description={t('reports.clients.desc')} />
                <CardBody>
                  <HBarList
                    format={(v) => formatNumber(v, true)}
                    rows={leaderboard.map((row) => ({ label: clients.get(row.clientId)?.name ?? row.clientId, value: row.reach, sub: t('reports.clients.engagement', { count: formatNumber(row.engagement, true) }) }))}
                  />
                </CardBody>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
