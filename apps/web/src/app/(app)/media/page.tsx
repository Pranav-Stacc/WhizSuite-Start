import { AssetKinds, Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { ImageIcon, Plus, UploadCloud } from 'lucide-react';
import { getPermissions, loadIf, requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { EmptyAction } from '@/shared/ui/empty-action';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterSelect } from '@/shared/ui/filter-select';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import type { Client } from '@/features/clients/data/clients.repository';
import { clientsById } from '@/features/clients/services/clients.service';
import { AssetCard } from '@/features/media/components/asset-card';
import { AssetDialog } from '@/features/media/components/asset-dialog';
import { AssetUploader } from '@/features/media/components/asset-uploader';
import { listAssets } from '@/features/media/services/media.service';

export const metadata: Metadata = { title: t('media.title') };

const BASE = '/media';

const GUIDE: GuideItem[] = [
  { title: t('media.guide.find.title'), body: t('media.guide.find.body') },
  { title: t('media.guide.add.title'), body: t('media.guide.add.body') },
];

export default async function MediaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission(Permissions.FILES_VIEW);
  const sp = await searchParams;
  const kind = AssetKinds.find((k) => k === param(sp, 'kind'));
  const clientId = param(sp, 'client');
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const granted = await getPermissions();
  const canUpload = granted.has(Permissions.FILES_UPLOAD);
  const canDelete = granted.has(Permissions.FILES_DELETE);
  const [assets, clients] = await Promise.all([listAssets(), loadIf(Permissions.CLIENTS_VIEW, clientsById, new Map<string, Client>())]);
  const scoped = assets.filter((a) => (!clientId || a.clientId === clientId) && (!query || a.name.toLowerCase().includes(query) || a.tags.some((tag) => tag.includes(query))));
  const visible = scoped.filter((a) => !kind || a.kind === kind);
  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, ...overrides });
  const clientOptions = [...clients.values()].map((c) => ({ id: c.id, name: c.name }));
  const addButton = (
    <Button variant="primary">
      {isLiveMode ? <UploadCloud /> : <Plus />}
      {isLiveMode ? t('media.upload') : t('media.add')}
    </Button>
  );
  const openOnLoad = param(sp, 'new') === '1';

  return (
    <div>
      <PageHeader
        title={t('media.title')}
        description={t('media.description')}
        eyebrow={<ImageIcon className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            {!canUpload ? null : isLiveMode ? (
              <AssetUploader clients={clientOptions} defaultOpen={openOnLoad} defaultClientId={clientId} trigger={addButton} />
            ) : (
              <AssetDialog clients={clientOptions} defaultOpen={openOnLoad} defaultClientId={clientId} trigger={addButton} />
            )}
          </>
        }
      />

      <div role="search" aria-label={t('media.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('media.search')} className="max-w-64" />
        <FilterChips
          items={[
            { href: link({ kind: undefined }), label: t('common.all'), active: !kind, count: scoped.length },
            ...AssetKinds.map((k) => ({ href: link({ kind: k }), label: t(`media.kind.${k}`), active: kind === k, count: scoped.filter((a) => a.kind === k).length })),
          ]}
        />
        <FilterSelect
          name="client"
          value={clientId}
          label={t('tasks.filter.client')}
          allLabel={t('tasks.filter.client')}
          options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
          className="ml-auto"
        />
      </div>

      {visible.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<ImageIcon />}
            title={t('media.empty.title')}
            body={t('media.empty.body')}
            action={<EmptyAction filtered={Boolean(kind || clientId || query)} clearHref={BASE} createHref={canUpload ? link({ new: '1' }) : undefined} createLabel={isLiveMode ? t('media.upload') : t('media.add')} />}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((asset) => (
            <li key={asset.id}>
              <AssetCard asset={asset} clientName={clients.get(asset.clientId)?.name} canDelete={canDelete} canDownload={isLiveMode} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
