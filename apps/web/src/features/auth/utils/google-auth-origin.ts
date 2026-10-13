import { apexAuthOrigin, isApexAuthHost } from '@/shared/workspace/host';
import { publicEnv } from '@/shared/config/public-env';

/** GIS only runs on apex/www/localhost — not per-agency subdomains (Google OAuth policy). */
export function googleSignInUsesCanonicalHost(hostname: string): boolean {
  const root = publicEnv.appRootDomain;
  if (!root) return false;
  return !isApexAuthHost(hostname, root);
}

export function canonicalGoogleAuthPageUrl(
  mode: 'login' | 'register',
  returnTo: string,
): string | null {
  const root = publicEnv.appRootDomain;
  if (!root) return null;
  const path = mode === 'register' ? '/register' : '/login';
  const base = apexAuthOrigin(root);
  const params = new URLSearchParams();
  if (returnTo) params.set('returnTo', returnTo);
  const query = params.toString();
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}
