const STORAGE_KEY = 'whiz_google_id_token';

/** Short-lived Google ID token so register can finish without opening GIS again. */
export function savePendingGoogleIdToken(idToken: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, idToken);
}

export function readPendingGoogleIdToken(): string | null {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem(STORAGE_KEY);
  return value && value.length > 0 ? value : null;
}

export function clearPendingGoogleIdToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
