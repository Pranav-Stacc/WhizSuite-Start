'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import { isFirebaseMessagingConfigured, publicEnv } from '@/shared/config/public-env';

let app: FirebaseApp | undefined;
let messaging: Messaging | undefined;

function firebaseApp(): FirebaseApp | undefined {
  if (!isFirebaseMessagingConfigured()) return undefined;
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  const { firebase } = publicEnv;
  app = initializeApp({
    apiKey: firebase.apiKey,
    authDomain: firebase.authDomain || undefined,
    projectId: firebase.projectId,
    storageBucket: firebase.storageBucket || undefined,
    messagingSenderId: firebase.messagingSenderId,
    appId: firebase.appId,
  });
  return app;
}

export async function getFirebaseMessaging(): Promise<Messaging | undefined> {
  if (typeof window === 'undefined') return undefined;
  if (!(await isSupported())) return undefined;
  const instance = firebaseApp();
  if (!instance) return undefined;
  messaging ??= getMessaging(instance);
  return messaging;
}

/** Requests notification permission and returns an FCM registration token. */
export async function obtainWebPushToken(): Promise<string | undefined> {
  const messagingInstance = await getFirebaseMessaging();
  if (!messagingInstance) return undefined;
  if (Notification.permission === 'denied') return undefined;
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return undefined;
  }
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  return getToken(messagingInstance, {
    vapidKey: publicEnv.firebase.vapidKey,
    serviceWorkerRegistration: registration,
  });
}

export function listenForegroundMessages(
  handler: (payload: { title?: string; body?: string }) => void,
): () => void {
  let unsubscribe: (() => void) | undefined;
  void getFirebaseMessaging().then((messagingInstance) => {
    if (!messagingInstance) return;
    unsubscribe = onMessage(messagingInstance, (payload) => {
      handler({
        title: payload.notification?.title ?? undefined,
        body: payload.notification?.body ?? undefined,
      });
    });
  });
  return () => {
    unsubscribe?.();
  };
}
