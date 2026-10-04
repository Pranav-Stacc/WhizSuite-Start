import type { Metadata } from 'next';
import { FileText, Image, Video } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatDate, formatFileSize } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { PageHeader } from '@/shared/ui/page-header';
import { portalFiles } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.files.title') };

const KIND_ICON = { image: Image, video: Video, document: FileText };

export default async function PortalFilesPage() {
  const session = await requireSession();
  const files = await portalFiles(session.clientId!);

  return (
    <div>
      <PageHeader title={t('portal.files.title')} description={t('portal.files.description')} eyebrow={<FileText className="inline size-3.5" />} />
      {files.length === 0 ? (
        <Card>
          <EmptyState icon={<FileText />} title={t('portal.files.empty.title')} body={t('portal.files.empty.body')} />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {files.map((file) => {
            const Icon = KIND_ICON[file.kind];
            return (
              <li key={file.id} className="card-surface flex items-start gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-surface-3">
                  <Icon className="size-5 text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted">{formatFileSize(file.sizeKb)} · {formatDate(file.createdAt)}</p>
                  {file.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {file.tags.map((tag) => (
                        <Badge key={tag} tone="neutral">{tag}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
