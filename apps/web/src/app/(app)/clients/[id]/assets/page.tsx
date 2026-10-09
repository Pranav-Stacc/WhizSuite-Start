import { Permissions } from '@agency-os/contracts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Folder, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { getPermissions, requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { EmptyState } from '@/shared/ui/feedback';
import { param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { SectionHeading } from '@/shared/ui/section-heading';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { AssetCard } from '@/features/media/components/asset-card';
import { EnsureFoldersButton, NewFolderDialog } from '@/features/media/components/folder-actions';
import { FolderTree, buildFolderTree, folderAncestors } from '@/features/media/components/folder-tree';
import { UploadDropzone } from '@/features/media/components/upload-dropzone';
import { deleteFolderAction } from '@/features/media/actions/folder.actions';
import { listFolders } from '@/features/media/services/folders.service';
import { listAssets } from '@/features/media/services/media.service';

export const metadata = { title: t('clients.workspace.assets') };

export default async function ClientAssetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission(Permissions.FILES_VIEW);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const client = await getClient(id);
  if (!client) notFound();

  const folderId = param(sp, 'folder') || undefined;
  const base = `/clients/${client.id}/assets`;
  const link = (overrides: Record<string, string | undefined>) => withQuery(base, sp, overrides);
  const folderHref = (id: string | undefined) => link({ folder: id });

  const [allAssets, folders] = await Promise.all([listAssets(), listFolders(client.id)]);
  const clientAssets = allAssets
    .filter((a) => a.clientId === client.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tree = buildFolderTree(folders);
  const crumbs = folderAncestors(folders, folderId);
  const current = folderId ? folders.find((f) => f.id === folderId) : undefined;
  const visibleFolders = (folderId ? folders.filter((f) => f.parentId === folderId) : tree).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const assets = folderId
    ? clientAssets.filter((a) => a.folderId === folderId)
    : clientAssets.filter((a) => !a.folderId || !folders.some((f) => f.id === a.folderId));
  const childCount = (id: string) => folders.filter((f) => f.parentId === id).length;
  const fileCount = (id: string) => clientAssets.filter((a) => a.folderId === id).length;

  const granted = await getPermissions();
  const canUpload = isLiveMode && granted.has(Permissions.FILES_UPLOAD);
  const canDelete = granted.has(Permissions.FILES_DELETE);
  const parentRedirect = current?.parentId ? folderHref(current.parentId) : folderHref(undefined);

  return (
    <section>
      <SectionHeading number={clientSectionNumber('assets')} title={t('clients.workspace.assets')}>
        <span className="eyebrow">{t('assets.count', { count: folderId ? assets.length : clientAssets.length })}</span>
        {canUpload || (folderId && canDelete) ? (
          <div className="flex flex-wrap items-center gap-2">
            {canUpload && folders.length === 0 ? <EnsureFoldersButton clientId={client.id} /> : null}
            {canUpload ? (
              <NewFolderDialog
                clientId={client.id}
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
      </SectionHeading>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="card-surface h-fit p-3">
          <p className="eyebrow mb-2 px-1">{t('clients.assets.tree.title')}</p>
          <FolderTree roots={tree} activeId={folderId} hrefFor={folderHref} />
          {canUpload && folders.length > 0 ? (
            <div className="mt-3 border-t border-border-soft px-1 pt-3">
              <EnsureFoldersButton clientId={client.id} />
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

          {visibleFolders.length ? (
            <ul className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleFolders.map((folder) => (
                <li key={folder.id}>
                  <Link
                    href={folderHref(folder.id)}
                    className="flex items-start gap-3 border border-border px-4 py-3 transition-colors hover:border-foreground"
                  >
                    <Folder className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{folder.name}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted">
                        <span>{t('clients.assets.subfolders', { count: childCount(folder.id) })}</span>
                        <span>{t('clients.assets.filesHere', { count: fileCount(folder.id) })}</span>
                        <span>
                          {folder.visibility === 'CLIENT_VISIBLE'
                            ? t('clients.assets.visibility.client')
                            : t('clients.assets.visibility.internal')}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <UploadDropzone clientId={client.id} enabled={canUpload} folderId={folderId} className="mb-6" />

          {assets.length ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <AssetCard asset={asset} canDelete={canDelete} canDownload={isLiveMode} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-surface">
              <EmptyState
                icon={<ImageIcon />}
                title={folderId ? t('clients.assets.emptyFolder') : t('assets.empty.title')}
                body={folderId ? t('clients.assets.emptyFolder.body') : t('assets.empty.body')}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
