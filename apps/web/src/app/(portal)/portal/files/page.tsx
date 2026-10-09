import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { PageHeader } from '@/shared/ui/page-header';
import { AssetCard } from '@/features/media/components/asset-card';
import { portalFiles } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.files.title') };

export default async function PortalFilesPage() {
  const session = await requireSession();
  const files = session.clientId ? await portalFiles(session.clientId) : [];

  return (
    <div>
      <PageHeader title={t('portal.files.title')} description={t('portal.files.description')} eyebrow={<FileText className="inline size-3.5" />} />
      {files.length === 0 ? (
        <Card>
          <EmptyState icon={<FileText />} title={t('portal.files.empty.title')} body={t('portal.files.empty.body')} />
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <li key={file.id}>
              <AssetCard asset={file} canDelete={false} canDownload={isLiveMode} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
