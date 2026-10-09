import { ContentStatuses, Permissions, Platforms } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { KanbanSquare, List, PencilLine, Plus } from 'lucide-react';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { EmptyAction } from '@/shared/ui/empty-action';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { Kanban } from '@/shared/ui/kanban';
import { FilterChips, ViewToggle, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { PLATFORM_META } from '@/shared/ui/platform';
import { SearchInput } from '@/shared/ui/search-input';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { clientsById } from '@/features/clients/services/clients.service';
import { moveContentAction } from '@/features/content/actions/content.actions';
import { toComposerAssets, toComposerClients } from '@/features/content/components/composer-mappers';
import { ContentCardContent } from '@/features/content/components/content-card';
import { ContentComposer } from '@/features/content/components/content-composer';
import { ContentList } from '@/features/content/components/content-list';
import { listContent } from '@/features/content/services/content.service';
import { listAssets } from '@/features/media/services/media.service';
import { membersById } from '@/features/team/services/members.service';

export const metadata: Metadata = { title: t('content.title') };

const BASE = '/content';

const GUIDE: GuideItem[] = [
  { title: t('content.guide.create.title'), body: t('content.guide.create.body') },
  { title: t('content.guide.board.title'), body: t('content.guide.board.body') },
  { title: t('content.guide.review.title'), body: t('content.guide.review.body') },
  { title: t('content.guide.calendar.title'), body: t('content.guide.calendar.body') },
];

export default async function ContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePermission(Permissions.CONTENT_VIEW);
  const sp = await searchParams;
  const view = param(sp, 'view') === 'list' ? 'list' : 'board';
  const clientId = param(sp, 'client');
  const platform = Platforms.find((p) => p === param(sp, 'platform'));
  const status = ContentStatuses.find((s) => s === param(sp, 'status'));
  const mine = param(sp, 'f') === 'mine';
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [posts, clients, members, assets] = await Promise.all([listContent(), clientsById(), membersById(), listAssets()]);
  const scoped = posts.filter(
    (p) =>
      (!clientId || p.clientId === clientId) &&
      (!platform || p.platforms.includes(platform)) &&
      (!query || p.title.toLowerCase().includes(query) || p.caption.toLowerCase().includes(query)),
  );
  const mineCount = scoped.filter((p) => p.authorId === session.userId).length;
  const visible = scoped.filter((p) => (!mine || p.authorId === session.userId) && (view === 'board' || !status || p.status === status));
  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, ...overrides });
  const hasFilters = Boolean(clientId || platform || status || mine || query);

  const composerClients = toComposerClients([...clients.values()]);
  const newButton = (
    <Button variant="primary">
      <Plus />
      {t('content.new')}
    </Button>
  );

  const columns = ContentStatuses.map((s) => ({
    id: s,
    title: statusLabel('content', s),
    color: TONE_COLOR[statusTone('content', s)],
    summary: t('content.col.count', { count: visible.filter((p) => p.status === s).length }),
  }));

  return (
    <div>
      <PageHeader
        title={t('content.title')}
        description={t('content.description')}
        eyebrow={<PencilLine className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            <ViewToggle
              items={[
                { href: link({ view: undefined }), label: t('tasks.view.board'), active: view === 'board', icon: <KanbanSquare /> },
                { href: link({ view: 'list' }), label: t('tasks.view.list'), active: view === 'list', icon: <List /> },
              ]}
            />
            <ContentComposer clients={composerClients} assets={toComposerAssets(assets)} defaultOpen={param(sp, 'new') === '1'} defaultClientId={clientId} trigger={newButton} />
          </>
        }
      />

      <div role="search" aria-label={t('content.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('content.search')} className="max-w-64" />
        <FilterChips
          items={[
            { href: link({ f: undefined }), label: t('tasks.filter.all'), active: !mine, count: scoped.length },
            { href: link({ f: 'mine' }), label: t('content.filter.mine'), active: mine, count: mineCount },
          ]}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <FilterSelect
            name="client"
            value={clientId}
            label={t('tasks.filter.client')}
            allLabel={t('tasks.filter.client')}
            options={[...clients.values()].map((c) => ({ value: c.id, label: c.name }))}
          />
          <FilterSelect
            name="platform"
            value={platform}
            label={t('content.filter.platform')}
            allLabel={t('content.filter.platform')}
            options={Platforms.map((p) => ({ value: p, label: PLATFORM_META[p].label }))}
          />
          {view === 'list' ? (
            <FilterSelect
              name="status"
              value={status}
              label={t('content.filter.status')}
              allLabel={t('content.filter.status')}
              options={ContentStatuses.map((s) => ({ value: s, label: statusLabel('content', s) }))}
            />
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<PencilLine />}
            title={t('content.empty.title')}
            body={t('content.empty.body')}
            action={<EmptyAction filtered={hasFilters} clearHref={BASE} createHref={link({ new: '1' })} createLabel={t('content.new')} />}
          />
        </div>
      ) : view === 'board' ? (
        <Kanban
          columns={columns}
          cards={visible.map((p) => ({
            id: p.id,
            columnId: p.status,
            href: `/content/${p.id}`,
            content: (
              <ContentCardContent
                title={p.title}
                contentType={p.contentType}
                platforms={p.platforms}
                scheduledAt={p.scheduledAt}
                clientName={clients.get(p.clientId)?.name}
                clientColor={clients.get(p.clientId)?.color}
                authorName={members.get(p.authorId)?.name}
              />
            ),
          }))}
          moveAction={moveContentAction}
        />
      ) : (
        <ContentList
          rows={visible.map((p) => ({
            id: p.id,
            title: p.title,
            contentType: p.contentType,
            platforms: p.platforms,
            status: p.status,
            scheduledAt: p.scheduledAt,
            clientName: clients.get(p.clientId)?.name,
            clientColor: clients.get(p.clientId)?.color,
            authorName: members.get(p.authorId)?.name,
          }))}
        />
      )}
    </div>
  );
}
