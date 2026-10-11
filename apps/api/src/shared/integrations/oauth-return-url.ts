import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/app.config';

export type OAuthReturnTo = 'mobile' | 'web';

export function mobileOAuthCallbackUrl(
  config: ConfigService<AppConfig, true>,
  params: Record<string, string>,
): string {
  const scheme = config.get('MOBILE_DEEP_LINK_SCHEME', { infer: true });
  const query = new URLSearchParams(params).toString();
  return `${scheme}://oauth?${query}`;
}

export function googleDriveOAuthReturnUrl(
  config: ConfigService<AppConfig, true>,
  stateRaw: string | undefined,
  outcome: 'connected' | 'error',
): string {
  const returnTo = readReturnTo(stateRaw);
  if (returnTo === 'mobile') {
    return mobileOAuthCallbackUrl(config, { drive: outcome });
  }
  const webOrigin = config.get('WEB_APP_URL', { infer: true });
  return `${webOrigin}/settings?tab=storage&drive=${outcome}`;
}

export function googleCalendarOAuthReturnUrl(
  config: ConfigService<AppConfig, true>,
  stateRaw: string | undefined,
  outcome: 'connected' | 'error',
): string {
  const returnTo = readReturnTo(stateRaw);
  if (returnTo === 'mobile') {
    return mobileOAuthCallbackUrl(config, { gcal: outcome });
  }
  const webOrigin = config.get('WEB_APP_URL', { infer: true });
  return `${webOrigin}/settings?tab=storage&gcal=${outcome}`;
}

function readReturnTo(stateRaw: string | undefined): OAuthReturnTo | undefined {
  if (!stateRaw) return undefined;
  try {
    const raw = JSON.parse(
      Buffer.from(stateRaw, 'base64url').toString('utf8'),
    ) as { returnTo?: OAuthReturnTo };
    return raw.returnTo;
  } catch {
    return undefined;
  }
}
