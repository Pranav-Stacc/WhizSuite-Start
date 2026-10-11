'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { GoogleCalendarConnectionDto, GoogleCalendarSyncTypes } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import {
  connectGoogleCalendarAction,
  disconnectGoogleCalendarAction,
  pullGoogleCalendarAction,
  updateGoogleCalendarSettingsAction,
} from '@/features/calendar/actions/google-calendar.actions';

const MS_DAY = 86_400_000;

function defaultPullRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * MS_DAY);
  return { from: from.toISOString(), to: to.toISOString() };
}

type SyncTypeKey = keyof GoogleCalendarSyncTypes;

const SYNC_TYPE_KEYS: SyncTypeKey[] = ['meetings', 'shoots', 'tasks', 'posts'];

export function GoogleCalendarSettings({
  connection,
  canManage,
  toastStatus,
}: {
  connection: GoogleCalendarConnectionDto;
  canManage: boolean;
  toastStatus?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const connected = connection.status === 'CONNECTED';

  useEffect(() => {
    if (toastStatus === 'connected') toast.success(t('calendar.sync.connected'));
    if (toastStatus === 'error') toast.error(t('calendar.sync.error'));
  }, [toastStatus]);

  if (!connection.oauthConfigured && !connected) {
    return (
      <Card>
        <CardHeader title={t('calendar.sync.title')} description={t('calendar.sync.notConfigured')} />
      </Card>
    );
  }

  const patchTypes = (next: GoogleCalendarSyncTypes) => {
    startTransition(async () => {
      const result = await updateGoogleCalendarSettingsAction({ syncTypes: next });
      if (result.ok) {
        toast.success(t('calendar.sync.settingsSaved'));
        router.refresh();
      } else toast.error(result.message ?? t('toast.failed'));
    });
  };

  return (
    <Card>
      <CardHeader
        title={t('calendar.sync.title')}
        description={t('settings.storage.calendar.desc')}
        action={
          connected ? (
            <span className="text-[12px] text-success">{t('calendar.sync.connected')}</span>
          ) : (
            <span className="text-[12px] text-muted">{t('calendar.sync.disconnected')}</span>
          )
        }
      />
      <CardBody className="space-y-4">
        {canManage ? (
          <>
            {!connected ? (
              <Button
                variant="primary"
                size="sm"
                disabled={pending || connection.status === 'DISABLED'}
                onClick={() => {
                  startTransition(async () => {
                    const result = await connectGoogleCalendarAction();
                    if (result.ok && result.data?.authorizeUrl) {
                      window.location.href = result.data.authorizeUrl;
                    } else toast.error(!result.ok ? result.message : t('toast.failed'));
                  });
                }}
              >
                {t('calendar.sync.connect')}
              </Button>
            ) : connection.connectionId ? (
              <>
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-foreground">{t('calendar.sync.typesHeading')}</p>
                  <p className="text-[12px] text-muted">{t('calendar.sync.typesHint')}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SYNC_TYPE_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-[12px] text-muted">
                        <input
                          type="checkbox"
                          className="size-3.5"
                          checked={connection.syncTypes[key]}
                          disabled={pending}
                          onChange={(e) => {
                            patchTypes({ ...connection.syncTypes, [key]: e.target.checked });
                          }}
                        />
                        {t(`calendar.sync.types.${key}`)}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    className="size-3.5"
                    checked={connection.defaultSyncNewEvents}
                    disabled={pending}
                    onChange={(e) => {
                      startTransition(async () => {
                        const result = await updateGoogleCalendarSettingsAction({
                          defaultSyncNewEvents: e.target.checked,
                        });
                        if (result.ok) {
                          toast.success(t('calendar.sync.settingsSaved'));
                          router.refresh();
                        } else toast.error(result.message ?? t('toast.failed'));
                      });
                    }}
                  />
                  {t('calendar.sync.defaultNew')}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-sm border border-border-soft bg-surface px-2 py-1 text-[12px]"
                    value={connection.syncDirection}
                    disabled={pending}
                    onChange={(e) => {
                      const syncDirection = e.target.value as 'OUT' | 'IN' | 'BOTH';
                      startTransition(async () => {
                        const result = await updateGoogleCalendarSettingsAction({ syncDirection });
                        if (result.ok) {
                          toast.success(t('calendar.sync.settingsSaved'));
                          router.refresh();
                        } else toast.error(result.message ?? t('toast.failed'));
                      });
                    }}
                  >
                    <option value="OUT">{t('calendar.sync.direction.out')}</option>
                    <option value="IN">{t('calendar.sync.direction.in')}</option>
                    <option value="BOTH">{t('calendar.sync.direction.both')}</option>
                  </select>
                  {connection.syncDirection !== 'OUT' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        const range = defaultPullRange();
                        startTransition(async () => {
                          const result = await pullGoogleCalendarAction(range);
                          if (result.ok) {
                            toast.success(t('calendar.sync.pullQueued'));
                            router.refresh();
                          } else toast.error(result.message ?? t('toast.failed'));
                        });
                      }}
                    >
                      {t('calendar.sync.pull')}
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await disconnectGoogleCalendarAction(connection.connectionId!);
                        if (result.ok) {
                          toast.success(t('calendar.sync.disconnectedToast'));
                          router.refresh();
                        } else toast.error(result.message ?? t('toast.failed'));
                      });
                    }}
                  >
                    {t('calendar.sync.disconnect')}
                  </Button>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <p className="text-[12px] text-muted">{t('calendar.sync.viewOnly')}</p>
        )}
      </CardBody>
    </Card>
  );
}
