'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { isFirebaseMessagingConfigured } from '@/shared/config/public-env';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Modal } from '@/shared/ui/overlays';
import { obtainWebPushToken } from '../lib/firebase-messaging';
import { registerWebPushDeviceAction } from '../actions/notification.actions';

const PROMPT_DISMISSED_KEY = 'whizsuite.push.promptDismissed';
const DEVICE_ID_KEY = 'whizsuite.push.deviceId';

interface WebPushPermissionPromptProps {
  enabled: boolean;
}

/** Explains browser push before calling `Notification.requestPermission`. */
export function WebPushPermissionPrompt({ enabled }: WebPushPermissionPromptProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (!isFirebaseMessagingConfigured()) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    try {
      if (localStorage.getItem(PROMPT_DISMISSED_KEY) === '1') return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const dismiss = () => {
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const enable = () => {
    void (async () => {
      try {
        const token = await obtainWebPushToken();
        if (token) {
          const result = await registerWebPushDeviceAction(token);
          if (result.ok && result.data?.deviceId) {
            localStorage.setItem(DEVICE_ID_KEY, result.data.deviceId);
          }
        }
      } catch {
        /* denied or unsupported */
      }
      dismiss();
    })();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
        else setOpen(true);
      }}
      title={t('notifications.push.prompt.title')}
      description={t('notifications.push.prompt.desc')}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
            {t('notifications.push.prompt.notNow')}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={enable}>
            {t('notifications.push.prompt.enable')}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 rounded-lg border border-border-soft bg-surface-2 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bell className="size-5" />
        </span>
        <p className="text-[13px] leading-relaxed text-muted">{t('notifications.push.prompt.body')}</p>
      </div>
    </Modal>
  );
}
