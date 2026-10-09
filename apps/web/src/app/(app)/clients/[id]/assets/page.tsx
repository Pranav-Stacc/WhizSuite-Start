import { Permissions } from '@agency-os/contracts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Folder, ImageIcon, Plus } from 'lucide-react';
import { getPermissions, requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { SectionHeading } from '@/shared/ui/section-heading';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { AssetCard } from '@/features/media/components/asset-card';
import { EnsureFoldersButton, NewFolderDialog } from '@/features/media/components/folder-actions';
import { UploadDropzone } from '@/features/media/components/upload-dropzone';
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

  const [allAssets, folders] = await Promise.all([listAssets(), listFolders(client.id)]);
  const clientAssets = allAssets.filter((a) => a.clientId === client.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Root view: folders whose parent is outside this client's tree (or null).
  const rootFolders = folders.filter((f) => !f.parentId || !folders.some((p) => p.id === f.parentId));
  const visibleFolders = (folderId ? folders.filter((f) => f.parentId === folderId) : rootFolders).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const assets = folderId
    ? clientAssets.filter((a) => a.folderId === folderId)
    : clientAssets.filter((a) => !a.folderId || !folders.some((f) => f.id === a.folderId));
  const current = folderId ? folders.find((f) => f.id === folderId) : undefined;
  const granted = await getPermissions();
  const canUpload = isLiveMode && granted.has(Permissions.FILES_UPLOAD);
  const canDelete = granted.has(Permissions.FILES_DELETE);

  return (
    <section>
      <SectionHeading number={clientSectionNumber('assets')} title={t('clients.workspace.assets')}>
        <span className="eyebrow">{t('assets.count', { count: folderId ? assets.length : clientAssets.length })}</span>
        {canUpload ? (
          <div className="flex flex-wrap items-center gap-2">
            {folders.length === 0 ? <EnsureFoldersButton clientId={client.id} /> : null}
            <NewFolderDialog
              clientId={client.id}
              parentId={folderId}
              trigger={
                <Button variant="secondary" size="sm">
                  <Plus />
                  {t('clients.assets.newFolder')}
                </Button>
              }
            />
          </div>
        ) : null}
      </SectionHeading>

      <nav aria-label={t('clients.assets.folders')} className="mb-4 flex flex-wrap items-center gap-2 text-[12px]">
        <Link href={link({ folder: undefined })} className={cn('nav-link', !folderId && 'text-foreground')}>
          {t('clients.assets.all')}
        </Link>
        {current ? (
          <>
            <span className="text-muted">/</span>
            <span className="text-foreground">{current.name}</span>
          </>
        ) : null}
      </nav>

      {visibleFolders.length ? (
        <ul className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleFolders.map((folder) => (
            <li key={folder.id}>
              <Link
                href={link({ folder: folder.id })}
                className="flex items-center gap-3 border border-border px-4 py-3 transition-colors hover:border-foreground"
              >
                <Folder className="size-4 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{folder.name}</span>
                <span className="text-[11px] text-muted">{folder.visibility === 'CLIENT_VISIBLE' ? t('clients.assets.visibility.client') : t('clients.assets.visibility.internal')}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <UploadDropzone clientId={client.id} enabled={canUpload} folderId={folderId} className="mb-6" />

      {assets.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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
            title={folderId ? t('clients.assets.unfiled') : t('assets.empty.title')}
            body={t('assets.empty.body')}
          />
        </div>
      )}
    </section>
  );
}
