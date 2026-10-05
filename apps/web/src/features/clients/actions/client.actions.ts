'use server';

import { ClientStatuses, brandKitSchema, createClientSchema, type ClientStatus } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { patchClient, patchClientBrandKit } from '@/shared/api/live/mutations';
import { clientBrandKitToApi } from '@/shared/api/live/mappers';
import { isLiveMode } from '@/shared/config/env';
import { recordAudit } from '@/features/audit/services/audit.service';
import { clientsRepository } from '../data/clients.repository';
import { onboardClient } from '../services/clients.service';

const LIST_SEPARATOR = /[\s,]+/;
const PILLAR_SEPARATOR = /\s*,\s*/;

async function authorize() {
  const session = await requireSession();
  if (!ROLES_LEADERSHIP.includes(session.role)) throw new Error('forbidden');
  return session;
}

function splitList(value: string | undefined, separator: RegExp): string[] {
  return (value ?? '')
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHashtag(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

export async function createClientAction(raw: unknown): Promise<ActionResult<{ href: string }>> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createClientSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;

    const client = await onboardClient({
      name: input.displayName,
      ownerId: session.userId,
      industry: input.industry,
      website: input.website,
      tier: input.tier,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
    });
    await recordAudit({ action: 'client.created', entityType: 'client', entityId: client.id, entityLabel: client.name, summary: 'Created client' });
    await refreshData('clients');
    return succeed({ href: `/clients/${client.id}` }, t('clients.created'));
  });
}

export async function updateBrandKitAction(clientId: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const parsed = parseInput(brandKitSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const before = await clientsRepository.get(clientId);
    if (!before) return fail(t('toast.failed'));

    const brand = {
      primary: input.primary,
      secondary: input.secondary,
      accent: input.accent,
      voice: input.voice ?? '',
      hashtags: splitList(input.hashtags, LIST_SEPARATOR).map(normalizeHashtag),
      pillars: splitList(input.pillars, PILLAR_SEPARATOR),
    };
    if (isLiveMode) {
      await patchClientBrandKit(clientId, clientBrandKitToApi({ brand }));
    } else {
      await clientsRepository.update(clientId, { color: input.primary, brand });
    }
    await recordAudit({ action: 'client.brand_updated', entityType: 'client', entityId: clientId, entityLabel: before.name, summary: 'Updated brand kit' });
    await refreshData('clients');
    return succeed(undefined, t('clients.brand.updated'));
  });
}

export async function setClientStatusAction(clientId: string, status: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    if (!ClientStatuses.includes(status as ClientStatus)) return fail(t('toast.failed'));
    const before = await clientsRepository.get(clientId);
    if (!before) return fail(t('toast.failed'));
    if (isLiveMode) await patchClient(clientId, { status });
    else await clientsRepository.update(clientId, { status: status as ClientStatus });
    await recordAudit({
      action: 'client.status_changed',
      entityType: 'client',
      entityId: clientId,
      entityLabel: before.name,
      summary: 'Changed client status',
      diff: { status: { from: before.status, to: status } },
    });
    await refreshData('clients');
    return succeed(undefined, t('clients.status.updated'));
  });
}
