'use server';

import { connectIntegrationSchema } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { setClientPlatforms } from '@/features/clients/services/clients.service';
import { PLATFORM_META } from '@/shared/ui/platform';
import { integrationsRepository } from '../data/integrations.repository';
import { connectedPlatforms } from '../services/integrations.service';

async function authorize() {
  const session = await requireSession();
  if (!ROLES_LEADERSHIP.includes(session.role)) throw new Error('forbidden');
  return session;
}

export async function connectIntegrationAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(connectIntegrationSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = await integrationsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
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
    await authorize();
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
    await authorize();
    const before = await integrationsRepository.get(id);
    if (!before?.connected) return fail(t('toast.failed'));
    await integrationsRepository.update(id, { lastSyncAt: new Date().toISOString() });
    await recordAudit({ action: 'integration.synced', entityType: 'integration', entityId: id, entityLabel: `${PLATFORM_META[before.platform].label} ${before.handle}`, summary: 'Synced channel' });
    await refreshData('integrations');
    return succeed(undefined, t('integrations.synced'));
  });
}
