/** Browser-visible Firebase / Google settings (NEXT_PUBLIC_* only). */
export const publicEnv = {
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '',
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() ?? '',
  },
} as const;

export function isFirebaseMessagingConfigured(): boolean {
  const { firebase } = publicEnv;
  return Boolean(
    firebase.apiKey &&
      firebase.projectId &&
      firebase.appId &&
      firebase.messagingSenderId &&
      firebase.vapidKey,
  );
}
