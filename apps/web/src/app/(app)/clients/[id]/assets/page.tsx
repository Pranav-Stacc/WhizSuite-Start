import { notFound } from 'next/navigation';
import { requireRole } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { ROLES_LEADERSHIP, ROLES_STAFF } from '@/shared/navigation/nav-config';
import { ImageIcon } from 'lucide-react';
import { EmptyState } from '@/shared/ui/feedback';
import { SectionHeading } from '@/shared/ui/section-heading';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { AssetCard } from '@/features/media/components/asset-card';
import { UploadDropzone } from '@/features/media/components/upload-dropzone';
import { listAssets } from '@/features/media/services/media.service';

export const metadata = { title: t('clients.workspace.assets') };

export default async function ClientAssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(ROLES_STAFF);
  const client = await getClient((await params).id);
  if (!client) notFound();
  const assets = (await listAssets()).filter((a) => a.clientId === client.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const leadership = ROLES_LEADERSHIP.includes(session.role);

  return (
    <section>
      <SectionHeading number={clientSectionNumber('assets')} title={t('clients.workspace.assets')}>
        <span className="eyebrow">{t('assets.count', { count: assets.length })}</span>
      </SectionHeading>
      <UploadDropzone clientId={client.id} enabled={isLiveMode} className="mb-6" />
      {assets.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {assets.map((asset) => (
            <li key={asset.id}>
              <AssetCard asset={asset} canDelete={leadership || asset.uploadedBy === session.userId} canDownload={isLiveMode} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card-surface">
          <EmptyState icon={<ImageIcon />} title={t('assets.empty.title')} body={t('assets.empty.body')} />
        </div>
      )}
    </section>
  );
}
