'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { GoogleCalendarConnectionDto } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import {
  connectGoogleCalendarAction,
  disconnectGoogleCalendarAction,
  pullGoogleCalendarAction,
  updateGoogleCalendarSettingsAction,
} from '../actions/google-calendar.actions';

interface GoogleCalendarPanelProps {
  connection: GoogleCalendarConnectionDto;
  canManage: boolean;
  rangeFrom: string;
  rangeTo: string;
  toastStatus?: string;
}

export function GoogleCalendarPanel({
  connection,
  canManage,
  rangeFrom,
  rangeTo,
  toastStatus,
}: GoogleCalendarPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const connected = connection.status === 'CONNECTED';

  if (toastStatus === 'connected') {
    // one-shot UX hint via query param — toast once on mount path from page
  }

  if (!connection.oauthConfigured && !connected) {
    return (
      <p className="text-[12px] text-muted">{t('calendar.sync.notConfigured')}</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border-soft bg-surface px-3 py-2 text-[12px]">
      <span className="font-medium text-foreground">{t('calendar.sync.title')}</span>
      <span className="text-muted">
        {connected ? t('calendar.sync.connected') : t('calendar.sync.disconnected')}
      </span>
      {canManage ? (
        <>
          {connected && connection.connectionId ? (
            <>
              <label className="inline-flex items-center gap-1.5 text-muted">
                <input
                  type="checkbox"
                  className="size-3.5"
                  checked={connection.defaultSyncNewEvents}
                  disabled={pending}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    startTransition(async () => {
                      const result = await updateGoogleCalendarSettingsAction({
                        defaultSyncNewEvents: checked,
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
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await pullGoogleCalendarAction({ from: rangeFrom, to: rangeTo });
                    if (result.ok) {
                      toast.success(t('calendar.sync.pullQueued'));
                      router.refresh();
                    } else toast.error(result.message ?? t('toast.failed'));
                  });
                }}
              >
                {t('calendar.sync.pull')}
              </Button>
              <Button
                variant="ghost"
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
            </>
          ) : (
            <Button
              variant="secondary"
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
          )}
        </>
      ) : null}
    </div>
  );
}
