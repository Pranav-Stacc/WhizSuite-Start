'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isFirebaseMessagingConfigured } from '@/shared/config/public-env';
import {
  registerWebPushDeviceAction,
  unregisterWebPushDeviceAction,
} from '../actions/notification.actions';
import { listenForegroundMessages, obtainWebPushToken } from '../lib/firebase-messaging';

const DEVICE_ID_KEY = 'whizsuite.push.deviceId';

/**
 * Registers the browser for FCM web push after sign-in (live mode + Firebase env only).
 * Mount once inside authenticated shells with `enabled` from the server.
 */
export function WebPushRegistrar({ enabled }: { enabled: boolean }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !enabled) return;
    if (!isFirebaseMessagingConfigured()) return;
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }
    started.current = true;

    let cancelled = false;
    const stopForeground = listenForegroundMessages(({ title, body }) => {
      if (title || body) toast(title ?? 'WhizSuite', { description: body });
    });

    void (async () => {
      try {
        const token = await obtainWebPushToken();
        if (!token || cancelled) return;
        const result = await registerWebPushDeviceAction(token);
        if (result.ok && result.data?.deviceId) {
          window.localStorage.setItem(DEVICE_ID_KEY, result.data.deviceId);
        }
      } catch {
        // Permission denied or unsupported browser — in-app + realtime still work.
      }
    })();

    return () => {
      cancelled = true;
      stopForeground();
    };
  }, [enabled]);

  return null;
}

/** Best-effort cleanup before clearing the session cookie. */
export async function unregisterStoredWebPushDevice(): Promise<void> {
  if (typeof window === 'undefined') return;
  const deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) return;
  window.localStorage.removeItem(DEVICE_ID_KEY);
  await unregisterWebPushDeviceAction(deviceId).catch(() => undefined);
}
