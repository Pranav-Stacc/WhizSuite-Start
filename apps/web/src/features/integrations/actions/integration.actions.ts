'use server';

import { connectIntegrationSchema, Permissions } from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { setClientPlatforms } from '@/features/clients/services/clients.service';
import { PLATFORM_META } from '@/shared/ui/platform';
import { integrationsRepository } from '../data/integrations.repository';
import { connectedPlatforms } from '../services/integrations.service';
import { beginMetaConnect } from '../services/meta.service';

/** Live channels are linked by the provider OAuth flow, never by typing a handle. */
const oauthRequired = (): ActionResult => fail(t('integrations.oauthRequired'));

const META_PLATFORMS = new Set(['instagram', 'facebook']);

/** Starts Meta Facebook Login → Instagram/Page token exchange (live only). */
export async function connectMetaAction(
  clientId: string,
  platform: 'instagram' | 'facebook',
): Promise<ActionResult<{ href: string }>> {
  return guarded(async () => {
    await authorize(Permissions.INTEGRATIONS_MANAGE);
    if (!isLiveMode) return fail(t('integrations.meta.liveOnly'));
    try {
      const { authorizeUrl } = await beginMetaConnect({ clientId, platform });
      return succeed(
        { href: authorizeUrl },
        t('integrations.meta.redirecting'),
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : t('integrations.meta.connectFailed'),
      );
    }
  });
}

export async function connectIntegrationAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.INTEGRATIONS_MANAGE);
    if (isLiveMode) return oauthRequired();
    const parsed = parseInput(connectIntegrationSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = await integrationsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (META_PLATFORMS.has(before.platform)) {
      return fail(t('integrations.meta.useOauthButton'));
    }
    const handle = parsed.data.handle.startsWith('@') ? parsed.data.handle : `@${parsed.data.handle}`;
    await integrationsRepository.update(id, { connected: true, handle, lastSyncAt: new Date().toISOString() });
    await setClientPlatforms(before.clientId, await connectedPlatforms(before.clientId));
    await recordAudit({
      action: 'integration.connected',
      entityType: 'integration',
      entityId: id,
      entityLabel: `${PLATFORM_META[before.platform].label} ${handle}`,
      summary: 'Connected channel',
    });
    await refreshData('integrations', 'clients');
    return succeed(undefined, t('integrations.connected', { platform: PLATFORM_META[before.platform].label }));
  });
}

export async function disconnectIntegrationAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.INTEGRATIONS_MANAGE);
    if (isLiveMode) return oauthRequired();
    const before = await integrationsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await integrationsRepository.update(id, { connected: false, followers: 0, lastSyncAt: undefined });
    await setClientPlatforms(before.clientId, await connectedPlatforms(before.clientId));
    await recordAudit({
      action: 'integration.disconnected',
      entityType: 'integration',
      entityId: id,
      entityLabel: `${PLATFORM_META[before.platform].label} ${before.handle}`,
      summary: 'Disconnected channel',
    });
    await refreshData('integrations', 'clients');
    return succeed(undefined, t('integrations.disconnected', { platform: PLATFORM_META[before.platform].label }));
  });
}

export async function syncIntegrationAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.INTEGRATIONS_MANAGE);
    if (isLiveMode) return oauthRequired();
    const before = await integrationsRepository.get(id);
    if (!before?.connected) return fail(t('toast.failed'));
    await integrationsRepository.update(id, { lastSyncAt: new Date().toISOString() });
    await recordAudit({ action: 'integration.synced', entityType: 'integration', entityId: id, entityLabel: `${PLATFORM_META[before.platform].label} ${before.handle}`, summary: 'Synced channel' });
    await refreshData('integrations');
    return succeed(undefined, t('integrations.synced'));
  });
}
