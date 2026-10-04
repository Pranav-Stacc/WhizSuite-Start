import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, CheckCircle2, Plus, Zap } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { StatCard } from '@/shared/ui/stat-card';
import { AutomationCard } from '@/features/automations/components/automation-card';
import { AutomationDialog } from '@/features/automations/components/automation-dialog';
import { RecipeGallery } from '@/features/automations/components/recipe-gallery';
import { RunLog } from '@/features/automations/components/run-log';
import { AUTOMATION_RECIPES, RUN_LOG_LIMIT } from '@/features/automations/config';
import type { Automation } from '@/features/automations/data/automations.repository';
import { listAutomations, listRecentRuns, summarizeAutomations } from '@/features/automations/services/automations.service';

export const metadata: Metadata = { title: t('automations.title') };

const BASE = '/automations';
const FILTERS = ['all', 'active', 'paused'] as const;
type AutomationFilter = (typeof FILTERS)[number];

const GUIDE: GuideItem[] = [
  { title: t('automations.guide.recipes.title'), body: t('automations.guide.recipes.body') },
  { title: t('automations.guide.toggle.title'), body: t('automations.guide.toggle.body') },
  { title: t('automations.guide.run.title'), body: t('automations.guide.run.body') },
  { title: t('automations.guide.log.title'), body: t('automations.guide.log.body') },
];

const predicates: Record<AutomationFilter, (automation: Automation) => boolean> = {
  all: () => true,
  active: (automation) => automation.enabled,
  paused: (automation) => !automation.enabled,
};

function parseFilter(value: string | undefined): AutomationFilter {
  return FILTERS.find((f) => f === value) ?? 'all';
}

export default async function AutomationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(ROLES_LEADERSHIP);
  const sp = await searchParams;
  const filter = parseFilter(param(sp, 'f'));
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [all, runs] = await Promise.all([listAutomations(), listRecentRuns(RUN_LOG_LIMIT)]);
  const stats = summarizeAutomations(all);
  const scoped = all.filter((a) => !query || a.name.toLowerCase().includes(query));
  const automations = scoped.filter(predicates[filter]);
  const names = new Map(all.map((a) => [a.id, a.name]));
  const existingPairs = new Set(all.map((a) => `${a.trigger}|${a.action}`));
  const recipes = AUTOMATION_RECIPES.filter((r) => !existingPairs.has(`${r.trigger}|${r.action}`));

  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, edit: undefined, ...overrides });
  const editAutomation = param(sp, 'edit') ? all.find((a) => a.id === param(sp, 'edit')) : undefined;
  const filterLabels: Record<AutomationFilter, string> = { all: t('automations.filter.all'), active: t('automations.filter.active'), paused: t('automations.filter.paused') };

  return (
    <div>
      <PageHeader
        title={t('automations.title')}
        description={t('automations.description')}
        eyebrow={<Zap className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <AutomationDialog
              defaultOpen={param(sp, 'new') === '1'}
              trigger={
                <Button variant="primary">
                  <Plus />
                  {t('automations.new')}
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t('automations.kpi.active')} value={stats.active} icon={<Zap />} hint={t('automations.kpi.active.hint', { total: all.length })} />
        <StatCard label={t('automations.kpi.runs')} value={stats.runs} icon={<Activity />} hint={t('automations.kpi.runs.hint')} />
        <StatCard label={t('automations.kpi.success')} value={stats.successRate === undefined ? '—' : `${stats.successRate}%`} icon={<CheckCircle2 />} hint={t('automations.kpi.success.hint')} />
      </div>

      <RecipeGallery recipes={recipes} />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <section aria-label={t('automations.list.title')}>
          <div role="search" aria-label={t('automations.filters.label')} className="mb-4 flex flex-wrap items-center gap-3">
            <SearchInput placeholder={t('automations.search')} className="max-w-64" />
            <FilterChips
              items={FILTERS.map((f) => ({ href: link({ f: f === 'all' ? undefined : f }), label: filterLabels[f], active: filter === f, count: scoped.filter(predicates[f]).length }))}
            />
          </div>
          {automations.length === 0 ? (
            <div className="card-surface">
              <EmptyState
                icon={<Zap />}
                title={t('automations.empty.title')}
                body={t('automations.empty.body')}
                action={
                  filter !== 'all' || query ? (
                    <Button variant="secondary" asChild>
                      <Link href={BASE}>{t('common.clearFilters')}</Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {automations.map((automation) => (
                <li key={automation.id}>
                  <AutomationCard automation={automation} editHref={link({ edit: automation.id })} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <RunLog runs={runs} automationName={(id) => names.get(id)} />
      </div>

      {editAutomation ? <AutomationDialog automation={editAutomation} defaultOpen /> : null}
    </div>
  );
}
