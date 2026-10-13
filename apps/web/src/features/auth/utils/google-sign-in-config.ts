import { authOAuthPublicConfigSchema, type AuthOAuthPublicConfig } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { isLiveMode } from '@/shared/config/env';
import { publicEnv } from '@/shared/config/public-env';

export async function fetchAuthOAuthPublicConfig(): Promise<AuthOAuthPublicConfig> {
  const raw = await apiFetch<unknown>('v1/auth/oauth-config', {
    revalidate: 300,
    tags: ['auth-oauth-config'],
  });
  return authOAuthPublicConfigSchema.parse(raw);
}

export function resolveGoogleSignInUi(oauth: AuthOAuthPublicConfig | null): {
  clientId: string;
  show: boolean;
} {
  const envClientId = publicEnv.googleClientId;
  if (envClientId) {
    return { clientId: envClientId, show: oauth?.google.enabled !== false };
  }
  if (!isLiveMode) return { clientId: '', show: false };
  if (!oauth?.google.enabled || !oauth.google.webClientId) {
    return { clientId: '', show: false };
  }
  return { clientId: oauth.google.webClientId, show: true };
}
