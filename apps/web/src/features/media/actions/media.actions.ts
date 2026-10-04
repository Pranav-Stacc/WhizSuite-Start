'use server';

import { createAssetSchema } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { hueFor } from '@/shared/lib/format';
import { recordAudit } from '@/features/audit/services/audit.service';
import { mediaRepository } from '../data/media.repository';

const TAG_SEPARATOR = /[\s,]+/;

async function authorize() {
  const session = await requireSession();
  if (!ROLES_STAFF.includes(session.role)) throw new Error('forbidden');
  return session;
}

export async function createAssetAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createAssetSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;

    const asset = await mediaRepository.create({
      clientId: input.clientId,
      name: input.name,
      kind: input.kind,
      sizeKb: 0,
      tags: (input.tags ?? '').split(TAG_SEPARATOR).filter(Boolean),
      hue: hueFor(input.name),
      uploadedBy: session.userId,
      createdAt: new Date().toISOString(),
    });
    await recordAudit({ action: 'asset.created', entityType: 'asset', entityId: asset.id, entityLabel: asset.name, summary: 'Added asset' });
    await refreshData('media');
    return succeed(undefined, t('media.added'));
  });
}

export async function deleteAssetAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const asset = await mediaRepository.get(id);
    if (!asset) return fail(t('toast.failed'));
    await mediaRepository.remove(id);
    await recordAudit({ action: 'asset.deleted', entityType: 'asset', entityId: id, entityLabel: asset.name, summary: 'Deleted asset' });
    await refreshData('media');
    return succeed(undefined, t('media.deleted'));
  });
}
