'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Cloud, HardDrive } from 'lucide-react';
import type { MediaDataSourceDto } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import {
  connectGoogleDriveAction,
  disconnectGoogleDriveAction,
  transferAllToDriveAction,
} from '../actions/storage.actions';
import { GoogleDriveImportButton } from './google-drive-import-button';

function statusTone(status: MediaDataSourceDto['status']): 'success' | 'warning' | 'neutral' | 'danger' {
  if (status === 'CONNECTED' || status === 'AVAILABLE') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'ERROR') return 'danger';
  return 'neutral';
}

export function DataSourcesPanel({
  sources,
  canManage,
  canTransfer,
  canImport,
  importClients = [],
}: {
  sources: MediaDataSourceDto[];
  canManage: boolean;
  canTransfer: boolean;
  canImport?: boolean;
  importClients?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {sources.map((source) => {
        const Icon = source.kind === 'google_drive' ? Cloud : HardDrive;
        const connected = source.status === 'CONNECTED';
        return (
          <Card key={source.id}>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-4" aria-hidden />
                  {source.kind === 'platform' ? t('media.storage.source.platform') : t('media.storage.source.drive')}
                </span>
              }
              description={
                source.kind === 'platform'
                  ? t('media.storage.source.platform.desc')
                  : t('media.storage.source.drive.desc')
              }
              action={<Badge tone={statusTone(source.status)}>{t(`media.storage.status.${source.status}`)}</Badge>}
            />
            <CardBody className="flex flex-wrap gap-2">
              {source.kind === 'platform' ? (
                <p className="text-sm text-muted">{t('media.storage.source.platform.note')}</p>
              ) : null}
              {source.kind === 'google_drive' && canManage ? (
                <>
                  {!connected && source.status !== 'DISABLED' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const result = await connectGoogleDriveAction();
                          if (result.ok && result.data?.authorizeUrl) {
                            window.location.href = result.data.authorizeUrl;
                          }
                        })
                      }
                    >
                      {t('media.storage.drive.connect')}
                    </Button>
                  ) : null}
                  {connected && source.connectionId ? (
                    <>
                      {canImport && importClients.length > 0 ? (
                        <GoogleDriveImportButton
                          connectionId={source.connectionId}
                          clients={importClients}
                        />
                      ) : null}
                      {canTransfer ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              await transferAllToDriveAction(source.connectionId!);
                              router.refresh();
                            })
                          }
                        >
                          {t('media.storage.drive.transferAll')}
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await disconnectGoogleDriveAction(source.connectionId!);
                            router.refresh();
                          })
                        }
                      >
                        {t('media.storage.drive.disconnect')}
                      </Button>
                    </>
                  ) : null}
                  {source.status === 'DISABLED' ? (
                    <p className="text-sm text-muted">{t('media.storage.drive.notConfigured')}</p>
                  ) : null}
                </>
              ) : null}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
