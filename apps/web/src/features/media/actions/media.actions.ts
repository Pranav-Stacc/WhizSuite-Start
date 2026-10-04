'use server';

import { z } from 'zod';
import {
  MediaDownloadDispositions,
  createAssetSchema,
  presignMediaUploadSchema,
  type MediaDownloadDisposition,
} from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { hueFor } from '@/shared/lib/format';
import { recordAudit } from '@/features/audit/services/audit.service';
import { DEMO_MIME_TYPES, mediaRepository } from '../data/media.repository';
import { completeUpload, createDownloadUrl, presignUpload } from '../services/media-upload.service';

const TAG_SEPARATOR = /[\s,]+/;
const assetIdSchema = z.string().uuid();
const dispositionSchema = z.enum(MediaDownloadDispositions);

export interface UploadTicket {
  assetId: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

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
      mimeType: DEMO_MIME_TYPES[input.kind],
      status: 'READY',
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

/** Step 1 of an upload: registers the asset and returns a short-lived URL the browser PUTs the file to. */
export async function requestUploadAction(raw: unknown): Promise<ActionResult<UploadTicket>> {
  return guarded(async () => {
    await authorize();
    if (!isLiveMode) return fail(t('media.upload.unavailable'));
    const parsed = parseInput(presignMediaUploadSchema, raw);
    if (!parsed.ok) return parsed.result;
    const presigned = await presignUpload(parsed.data);
    return succeed({ assetId: presigned.asset.id, uploadUrl: presigned.uploadUrl, headers: presigned.headers });
  });
}

/** Step 2 of an upload: the API verifies the object landed in storage and marks the asset ready. */
export async function completeUploadAction(assetId: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const id = assetIdSchema.safeParse(assetId);
    if (!id.success) return fail(t('toast.invalid'));
    await completeUpload(id.data);
    await refreshData('media');
    return succeed(undefined, t('media.uploaded'));
  });
}

export async function assetDownloadUrlAction(
  assetId: string,
  disposition: MediaDownloadDisposition,
): Promise<ActionResult<{ url: string }>> {
  return guarded(async () => {
    await requireSession();
    const id = assetIdSchema.safeParse(assetId);
    const mode = dispositionSchema.safeParse(disposition);
    if (!id.success || !mode.success) return fail(t('toast.invalid'));
    const { url } = await createDownloadUrl(id.data, mode.data);
    return succeed({ url });
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
