import { Permissions, Platforms } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox, MessageCircle, MessageSquareDashed } from 'lucide-react';
import { requirePermission } from '@/shared/auth/permissions';
import { t, type MessageKey } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { PLATFORM_META } from '@/shared/ui/platform';
import { SearchInput } from '@/shared/ui/search-input';
import { clientsById } from '@/features/clients/services/clients.service';
import { membersById } from '@/features/team/services/members.service';
import { ConversationPanel } from '@/features/inbox/components/conversation-panel';
import { InboxList } from '@/features/inbox/components/inbox-list';
import { InboxKinds, InboxStatuses, type InboxItem } from '@/features/inbox/data/inbox.repository';
import { listInbox } from '@/features/inbox/services/inbox.service';

export const metadata: Metadata = { title: t('inbox.title') };

const BASE = '/inbox';
const STATUS_FILTERS = ['all', ...InboxStatuses] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const GUIDE: GuideItem[] = [
  { title: t('inbox.guide.triage.title'), body: t('inbox.guide.triage.body') },
  { title: t('inbox.guide.reply.title'), body: t('inbox.guide.reply.body') },
  { title: t('inbox.guide.assign.title'), body: t('inbox.guide.assign.body') },
  { title: t('inbox.guide.filter.title'), body: t('inbox.guide.filter.body') },
];

function parseStatus(value: string | undefined): StatusFilter {
  return STATUS_FILTERS.find((s) => s === value) ?? 'open';
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePermission(Permissions.INBOX_VIEW);
  const sp = await searchParams;
  const status = parseStatus(param(sp, 'status'));
  const clientId = param(sp, 'client');
  const platform = param(sp, 'platform');
  const kind = param(sp, 'kind');
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [all, clients, members] = await Promise.all([listInbox(), clientsById(), membersById()]);

  const scoped = all.filter((item) => {
    if (clientId && item.clientId !== clientId) return false;
    if (platform && item.platform !== platform) return false;
    if (kind && item.kind !== kind) return false;
    if (query && !`${item.author} ${item.handle} ${item.body}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const matchesStatus = (item: InboxItem, filter: StatusFilter): boolean => filter === 'all' || item.status === filter;
  const items = scoped.filter((item) => matchesStatus(item, status));
  const selected = items.find((item) => item.id === param(sp, 'item'));
  const hasFilters = Boolean(clientId || platform || kind || query);

  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { item: undefined, ...overrides });
  const itemHref = (id: string) => withQuery(BASE, sp, { item: id });
  const clientName = (id: string) => clients.get(id)?.name;
  const statusLabel = (filter: StatusFilter): string => t(`inbox.filter.${filter}` as MessageKey);

  return (
    <div>
      <PageHeader title={t('inbox.title')} description={t('inbox.description')} eyebrow={<Inbox className="inline size-3.5" />} actions={<PageGuide items={GUIDE} />} />

      <div role="search" aria-label={t('inbox.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('inbox.search')} className="max-w-64" />
        <FilterChips
          items={STATUS_FILTERS.map((f) => ({
            href: link({ status: f === 'open' ? undefined : f }),
            label: statusLabel(f),
            active: status === f,
            count: scoped.filter((item) => matchesStatus(item, f)).length,
          }))}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <FilterSelect
            name="kind"
            value={kind}
            label={t('inbox.filter.kind')}
            allLabel={t('inbox.filter.kind')}
            options={InboxKinds.map((k) => ({ value: k, label: t(`inbox.kind.${k}` as MessageKey) }))}
          />
          <FilterSelect
            name="platform"
            value={platform}
            label={t('inbox.filter.platform')}
            allLabel={t('inbox.filter.platform')}
            options={Platforms.map((p) => ({ value: p, label: PLATFORM_META[p].label }))}
          />
          <FilterSelect
            name="client"
            value={clientId}
            label={t('inbox.filter.client')}
            allLabel={t('inbox.filter.client')}
            options={[...clients.values()].map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<MessageCircle />}
            title={status === 'open' && !hasFilters ? t('inbox.empty.zero.title') : t('inbox.empty.title')}
            body={status === 'open' && !hasFilters ? t('inbox.empty.zero.body') : t('inbox.empty.body')}
            action={
              hasFilters || status !== 'open' ? (
                <Button variant="secondary" asChild>
                  <Link href={BASE}>{t('common.clearFilters')}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,400px)_1fr]">
          <div className={selected ? 'hidden lg:block' : undefined}>
            <InboxList items={items} selectedId={selected?.id} clientName={clientName} itemHref={itemHref} />
          </div>
          {selected ? (
            <ConversationPanel
              key={selected.id}
              item={selected}
              clientName={clientName(selected.clientId)}
              assigneeName={selected.assigneeId ? members.get(selected.assigneeId)?.name : undefined}
              currentUserId={session.userId}
              backHref={link({})}
            />
          ) : (
            <div className="card-surface hidden lg:block">
              <EmptyState icon={<MessageSquareDashed />} title={t('inbox.select.title')} body={t('inbox.select.body')} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}