import { AssetKinds, Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Folder, ImageIcon, Plus, Trash2, UploadCloud } from 'lucide-react';
import { getPermissions, loadIf, requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { ConfirmButton } from '@/shared/ui/confirm-button';
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
import { EnsureFoldersButton, NewFolderDialog } from '@/features/media/components/folder-actions';
import { FolderTree, buildFolderTree, folderAncestors } from '@/features/media/components/folder-tree';
import { UploadDropzone } from '@/features/media/components/upload-dropzone';
import { deleteFolderAction } from '@/features/media/actions/folder.actions';
import { listFolders } from '@/features/media/services/folders.service';
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
  const folderId = param(sp, 'folder') || undefined;
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const granted = await getPermissions();
  const canUpload = granted.has(Permissions.FILES_UPLOAD);
  const canDelete = granted.has(Permissions.FILES_DELETE);
  const [assets, clients, folders] = await Promise.all([
    listAssets(),
    loadIf(Permissions.CLIENTS_VIEW, clientsById, new Map<string, Client>()),
    clientId ? listFolders(clientId) : Promise.resolve([]),
  ]);

  const scoped = assets.filter(
    (a) =>
      (!clientId || a.clientId === clientId) &&
      (!query || a.name.toLowerCase().includes(query) || a.tags.some((tag) => tag.includes(query))),
  );
  const byKind = scoped.filter((a) => !kind || a.kind === kind);
  const tree = buildFolderTree(folders);
  const crumbs = folderAncestors(folders, folderId);
  const current = folderId ? folders.find((f) => f.id === folderId) : undefined;
  const visibleFolders = (folderId ? folders.filter((f) => f.parentId === folderId) : tree).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const visible = clientId
    ? folderId
      ? byKind.filter((a) => a.folderId === folderId)
      : byKind.filter((a) => !a.folderId || !folders.some((f) => f.id === a.folderId))
    : byKind;

  const link = (overrides: Record<string, string | undefined>) => withQuery(BASE, sp, { new: undefined, ...overrides });
  const folderHref = (id: string | undefined) => link({ folder: id, client: clientId });
  const clientOptions = [...clients.values()].map((c) => ({ id: c.id, name: c.name }));
  const addButton = (
    <Button variant="primary">
      {isLiveMode ? <UploadCloud /> : <Plus />}
      {isLiveMode ? t('media.upload') : t('media.add')}
    </Button>
  );
  const openOnLoad = param(sp, 'new') === '1';
  const parentRedirect = current?.parentId ? folderHref(current.parentId) : folderHref(undefined);
  const childCount = (id: string) => folders.filter((f) => f.parentId === id).length;
  const fileCount = (id: string) => scoped.filter((a) => a.folderId === id).length;

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
            ...AssetKinds.map((k) => ({
              href: link({ kind: k }),
              label: t(`media.kind.${k}`),
              active: kind === k,
              count: scoped.filter((a) => a.kind === k).length,
            })),
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

      {clientId ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {canUpload && isLiveMode && folders.length === 0 ? <EnsureFoldersButton clientId={clientId} /> : null}
          {canUpload && isLiveMode ? (
            <NewFolderDialog
              clientId={clientId}
              parentId={folderId}
              trigger={
                <Button variant="secondary" size="sm">
                  <Plus />
                  {folderId ? t('clients.assets.newSubfolder') : t('clients.assets.newFolder')}
                </Button>
              }
            />
          ) : null}
          {folderId && canDelete ? (
            <ConfirmButton
              action={() => deleteFolderAction(folderId)}
              label={t('clients.assets.deleteFolder')}
              icon={<Trash2 />}
              size="sm"
              variant="ghost"
              redirectTo={parentRedirect}
            />
          ) : null}
        </div>
      ) : null}

      {clientId ? (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="card-surface h-fit p-3">
            <p className="eyebrow mb-2 px-1">{t('clients.assets.tree.title')}</p>
            <FolderTree roots={tree} activeId={folderId} hrefFor={folderHref} />
            {canUpload && isLiveMode && folders.length > 0 ? (
              <div className="mt-3 border-t border-border-soft px-1 pt-3">
                <EnsureFoldersButton clientId={clientId} />
              </div>
            ) : null}
          </aside>

          <div className="min-w-0">
            <nav aria-label={t('clients.assets.breadcrumb')} className="mb-4 flex flex-wrap items-center gap-1.5 text-[12px]">
              <Link href={folderHref(undefined)} className={!folderId ? 'text-foreground' : 'nav-link'}>
                {t('clients.assets.all')}
              </Link>
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <span key={crumb.id} className="inline-flex items-center gap-1.5">
                    <span className="text-muted">/</span>
                    {last ? (
                      <span className="text-foreground">{crumb.name}</span>
                    ) : (
                      <Link href={folderHref(crumb.id)} className="nav-link">
                        {crumb.name}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>

            {canUpload && isLiveMode ? (
              <UploadDropzone clientId={clientId} enabled folderId={folderId} className="mb-4" />
            ) : null}

            {visibleFolders.length > 0 ? (
              <ul className="mb-4 grid gap-2 sm:grid-cols-2">
                {visibleFolders.map((folder) => (
                  <li key={folder.id}>
                    <Link
                      href={folderHref(folder.id)}
                      className="card-surface flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <Folder className="size-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{folder.name}</span>
                      <span className="text-[11px] tabular-nums text-muted">
                        {t('clients.assets.subfolders', { count: String(childCount(folder.id)) })}
                        {' · '}
                        {fileCount(folder.id)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {visible.length === 0 ? (
              <div className="card-surface">
                <EmptyState
                  icon={<ImageIcon />}
                  title={t('media.empty.title')}
                  body={t('media.empty.body')}
                  action={
                    <EmptyAction
                      filtered={Boolean(kind || query || folderId)}
                      clearHref={link({ kind: undefined, folder: undefined, q: undefined })}
                      createHref={canUpload ? link({ new: '1' }) : undefined}
                      createLabel={isLiveMode ? t('media.upload') : t('media.add')}
                    />
                  }
                />
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((asset) => (
                  <li key={asset.id}>
                    <AssetCard
                      asset={asset}
                      clientName={clients.get(asset.clientId)?.name}
                      canDelete={canDelete}
                      canDownload={isLiveMode}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<ImageIcon />}
            title={t('media.empty.title')}
            body={t('media.empty.body')}
            action={
              <EmptyAction
                filtered={Boolean(kind || query)}
                clearHref={BASE}
                createHref={canUpload ? link({ new: '1' }) : undefined}
                createLabel={isLiveMode ? t('media.upload') : t('media.add')}
              />
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((asset) => (
            <li key={asset.id}>
              <AssetCard
                asset={asset}
                clientName={clients.get(asset.clientId)?.name}
                canDelete={canDelete}
                canDownload={isLiveMode}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
