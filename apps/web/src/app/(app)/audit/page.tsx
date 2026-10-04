import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, ScrollText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_OWNER } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { StatCard } from '@/shared/ui/stat-card';
import { AuditRow } from '@/features/audit/components/audit-row';
import { AUDIT_RANGES, parseAuditFilter } from '@/features/audit/filters';
import { auditFacets, filterAudit } from '@/features/audit/services/audit-query.service';

export const metadata: Metadata = { title: t('audit.title') };

const BASE = '/audit';
const EXPORT_PATH = '/audit/export';

const GUIDE: GuideItem[] = [
  { title: t('audit.guide.immutable.title'), body: t('audit.guide.immutable.body') },
  { title: t('audit.guide.filter.title'), body: t('audit.guide.filter.body') },
  { title: t('audit.guide.export.title'), body: t('audit.guide.export.body') },
];

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(ROLES_OWNER);
  const sp = await searchParams;
  const filter = parseAuditFilter((key) => param(sp, key));
  const [rows, facets] = await Promise.all([filterAudit(filter), auditFacets()]);

  const failures = rows.filter((r) => r.outcome === 'failure').length;
  const actors = new Set(rows.map((r) => r.actorId)).size;
  const hasFilters = Boolean(filter.query || filter.action || filter.entityType || filter.outcome || filter.actorId || filter.range !== 30);
  const exportHref = `${EXPORT_PATH}?${new URLSearchParams({
    ...(filter.query ? { q: filter.query } : {}),
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.entityType ? { entity: filter.entityType } : {}),
    ...(filter.outcome ? { outcome: filter.outcome } : {}),
    ...(filter.actorId ? { actor: filter.actorId } : {}),
    range: String(filter.range),
  }).toString()}`;

  return (
    <div>
      <PageHeader
        title={t('audit.title')}
        description={t('audit.description')}
        eyebrow={<ScrollText className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <Button variant="secondary" asChild>
              <Link href={exportHref}>
                <Download />
                {t('audit.export')}
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('audit.stat.events')} value={String(rows.length)} icon={<ScrollText />} hint={t('audit.stat.events.hint')} />
        <StatCard label={t('audit.stat.failures')} value={String(failures)} icon={<ShieldAlert />} hint={t('audit.stat.failures.hint')} />
        <StatCard label={t('audit.stat.actors')} value={String(actors)} icon={<ShieldCheck />} hint={t('audit.stat.actors.hint')} />
        <StatCard label={t('audit.stat.retention')} value={t('audit.stat.retention.value')} icon={<ShieldCheck />} hint={t('audit.stat.retention.hint')} />
      </div>

      <div role="search" aria-label={t('audit.filters.label')} className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput placeholder={t('audit.search')} className="max-w-72" />
          <FilterChips
            items={[
              { href: withQuery(BASE, sp, { range: undefined }), label: t('audit.range.30'), active: filter.range === 30, count: undefined },
              ...AUDIT_RANGES.filter((d) => d !== 30).map((d) => ({
                href: withQuery(BASE, sp, { range: String(d) }),
                label: t('audit.range.days', { days: d }),
                active: filter.range === d,
              })),
              { href: withQuery(BASE, sp, { range: 'all' }), label: t('audit.range.all'), active: filter.range === 'all' },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterSelect name="action" value={filter.action} label={t('audit.filter.action')} allLabel={t('audit.filter.action')} options={facets.actions.map((a) => ({ value: a, label: a.replace(/\./g, ' · ') }))} />
          <FilterSelect name="entity" value={filter.entityType} label={t('audit.filter.entity')} allLabel={t('audit.filter.entity')} options={facets.entityTypes.map((e) => ({ value: e, label: e }))} />
          <FilterSelect
            name="outcome"
            value={filter.outcome}
            label={t('audit.filter.outcome')}
            allLabel={t('audit.filter.outcome')}
            options={[
              { value: 'success', label: t('audit.outcome.success') },
              { value: 'failure', label: t('audit.outcome.failure') },
            ]}
          />
          <FilterSelect name="actor" value={filter.actorId} label={t('audit.filter.actor')} allLabel={t('audit.filter.actor')} options={facets.actors.map((a) => ({ value: a.id, label: a.name }))} className="ml-auto" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<ScrollText />}
            title={t('audit.empty.title')}
            body={t('audit.empty.body')}
            action={
              hasFilters ? (
                <Button variant="secondary" asChild>
                  <Link href={BASE}>{t('common.clearFilters')}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((entry) => (
            <li key={entry.id}>
              <AuditRow entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
