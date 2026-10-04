import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeDollarSign, KanbanSquare, List, Percent, Plus, Target, Trophy, TrendingUp } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { ActionButton } from '@/shared/ui/action-button';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { Kanban } from '@/shared/ui/kanban';
import { FilterChips, ViewToggle, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { StatCard } from '@/shared/ui/stat-card';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { membersById } from '@/features/team/services/members.service';
import { convertLeadAction, moveLeadAction } from '@/features/leads/actions/lead.actions';
import { LeadCardContent } from '@/features/leads/components/lead-card';
import { LeadDialog } from '@/features/leads/components/lead-dialog';
import { LeadList } from '@/features/leads/components/lead-list';
import type { Lead } from '@/features/leads/data/leads.repository';
import { listLeads, summarizePipeline } from '@/features/leads/services/leads.service';

export const metadata: Metadata = { title: t('leads.title') };

const BASE = '/leads';
const FILTERS = ['all', 'mine', 'open', 'followUp'] as const;
type LeadFilter = (typeof FILTERS)[number];

const GUIDE: GuideItem[] = [
  { title: t('leads.guide.drag.title'), body: t('leads.guide.drag.body') },
  { title: t('leads.guide.followUp.title'), body: t('leads.guide.followUp.body') },
  { title: t('leads.guide.convert.title'), body: t('leads.guide.convert.body') },
  { title: t('leads.guide.forecast.title'), body: t('leads.guide.forecast.body') },
];

function parseFilter(value: string | undefined): LeadFilter {
  return FILTERS.find((f) => f === value) ?? 'all';
}

const isOpen = (lead: Lead): boolean => lead.stage !== 'WON' && lead.stage !== 'LOST';

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_LEADERSHIP);
  const sp = await searchParams;
  const view = param(sp, 'view') === 'list' ? 'list' : 'board';
  const filter = parseFilter(param(sp, 'f'));
  const source = param(sp, 'source');
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [allLeads, members] = await Promise.all([listLeads(), membersById()]);
  const now = Date.now();

  const scoped = allLeads.filter((lead) => {
    if (source && lead.source !== source) return false;
    if (query && !`${lead.company} ${lead.contact}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const predicates: Record<LeadFilter, (lead: Lead) => boolean> = {
    all: () => true,
    mine: (lead) => lead.ownerId === session.userId,
    open: isOpen,
    followUp: (lead) => isOpen(lead) && Boolean(lead.nextStepAt) && new Date(lead.nextStepAt ?? 0).getTime() <= now,
  };
  const leads = scoped.filter(predicates[filter]);
  const summary = summarizePipeline(leads);
  const readyToConvert = allLeads.filter((lead) => lead.stage === 'WON' && !lead.convertedClientId);

  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, edit: undefined, ...overrides });
  const editLead = param(sp, 'edit') ? allLeads.find((lead) => lead.id === param(sp, 'edit')) : undefined;
  const hasFilters = filter !== 'all' || Boolean(source) || Boolean(query);
  const memberOptions = [...members.values()].filter((m) => m.status !== 'INVITED').map((m) => ({ id: m.id, name: m.name }));
  const ownerName = (id: string) => members.get(id)?.name;
  const sources = [...new Set(allLeads.map((lead) => lead.source))].sort();

  const filterLabels: Record<LeadFilter, string> = {
    all: t('leads.filter.all'),
    mine: t('leads.filter.mine'),
    open: t('leads.filter.open'),
    followUp: t('leads.filter.followUp'),
  };

  const columns = summary.stages.map(({ stage, count, value }) => ({
    id: stage,
    title: statusLabel('lead', stage),
    color: TONE_COLOR[statusTone('lead', stage)],
    summary: t('leads.col.total', { count, value: formatMoney(value, undefined, true) }),
  }));

  return (
    <div>
      <PageHeader
        title={t('leads.title')}
        description={t('leads.description')}
        eyebrow={<Target className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <ViewToggle
              items={[
                { href: link({ view: undefined }), label: t('leads.view.board'), active: view === 'board', icon: <KanbanSquare /> },
                { href: link({ view: 'list' }), label: t('leads.view.list'), active: view === 'list', icon: <List /> },
              ]}
            />
            <LeadDialog
              members={memberOptions}
              defaultOpen={param(sp, 'new') === '1'}
              trigger={
                <Button variant="primary">
                  <Plus />
                  {t('leads.new')}
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('leads.stat.open')} value={formatMoney(summary.open, undefined, true)} icon={<BadgeDollarSign />} hint={t('leads.stat.open.hint')} />
        <StatCard label={t('leads.stat.forecast')} value={formatMoney(summary.weighted, undefined, true)} icon={<TrendingUp />} hint={t('leads.stat.forecast.hint')} />
        <StatCard label={t('leads.stat.won')} value={formatMoney(summary.won, undefined, true)} icon={<Trophy />} hint={t('leads.stat.won.hint')} />
        <StatCard label={t('leads.stat.winRate')} value={summary.winRate === undefined ? '—' : `${summary.winRate}%`} icon={<Percent />} hint={t('leads.stat.winRate.hint')} />
      </div>

      {readyToConvert.length > 0 ? (
        <section aria-label={t('leads.ready.title')} className="mb-5 rounded-xl border border-success/40 bg-success/8 p-4">
          <p className="text-sm font-semibold">{t('leads.ready.title')}</p>
          <p className="mb-3 text-[13px] text-muted">{t('leads.ready.body')}</p>
          <ul className="flex flex-wrap gap-2">
            {readyToConvert.map((lead) => (
              <li key={lead.id}>
                <ActionButton action={convertLeadAction.bind(null, lead.id)} label={t('leads.ready.convert', { name: lead.company })} variant="primary" size="sm" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div role="search" aria-label={t('leads.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('leads.search')} className="max-w-64" />
        <FilterChips
          items={FILTERS.map((f) => ({
            href: link({ f: f === 'all' ? undefined : f }),
            label: filterLabels[f],
            active: filter === f,
            count: scoped.filter(predicates[f]).length,
          }))}
        />
        <FilterSelect
          name="source"
          value={source}
          label={t('leads.filter.source')}
          allLabel={t('leads.filter.source')}
          options={sources.map((s) => ({ value: s, label: s }))}
          className="ml-auto"
        />
      </div>

      {leads.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<Target />}
            title={t('leads.empty.title')}
            body={t('leads.empty.body')}
            action={
              hasFilters ? (
                <Button variant="secondary" asChild>
                  <Link href={BASE}>{t('common.clearFilters')}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : view === 'board' ? (
        <Kanban
          columns={columns}
          cards={leads.map((lead) => ({
            id: lead.id,
            columnId: lead.stage,
            href: link({ edit: lead.id }),
            content: <LeadCardContent lead={lead} ownerName={ownerName(lead.ownerId)} />,
          }))}
          moveAction={moveLeadAction}
        />
      ) : (
        <LeadList leads={leads} ownerName={ownerName} editHref={(id) => link({ edit: id })} />
      )}

      {editLead ? <LeadDialog members={memberOptions} lead={editLead} defaultOpen /> : null}
    </div>
  );
}
