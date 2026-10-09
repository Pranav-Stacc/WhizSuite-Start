'use server';

import { Permissions, createContractFormSchema, signContractSchema } from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import {
  agreementDownloadUrl,
  completeAgreementUpload,
  createAgreement,
  presignAgreementUpload,
  signAgreement,
  updateAgreement,
} from '../services/agreements.service';

export async function createAgreementAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.INVOICES_CREATE);
    const parsed = parseInput(createContractFormSchema, raw);
    if (!parsed.ok) return parsed.result;
    const agreement = await createAgreement({
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      type: parsed.data.type,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });
    await recordAudit({
      action: 'contract.created',
      entityType: 'contract',
      entityId: agreement.id,
      entityLabel: agreement.title,
      summary: 'Created client agreement',
    });
    await refreshData('contracts');
    return succeed(undefined, t('clients.agreements.created'));
  });
}

export async function markAgreementSignedAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.INVOICES_CREATE);
    if (!id) return fail(t('toast.invalid'));
    const agreement = await updateAgreement(id, { status: 'SIGNED', signedAt: new Date().toISOString() });
    await recordAudit({
      action: 'contract.signed',
      entityType: 'contract',
      entityId: agreement.id,
      entityLabel: agreement.title,
      summary: 'Marked agreement signed',
    });
    await refreshData('contracts');
    return succeed(undefined, t('clients.agreements.signed'));
  });
}

export async function presignAgreementUploadAction(
  id: string,
  input: { filename: string; sizeBytes: number },
): Promise<ActionResult<{ uploadUrl: string; headers: Record<string, string> }>> {
  return guarded(async () => {
    await authorize(Permissions.INVOICES_CREATE);
    if (!id) return fail(t('toast.invalid'));
    const ticket = await presignAgreementUpload(id, {
      filename: input.filename,
      mimeType: 'application/pdf',
      sizeBytes: input.sizeBytes,
    });
    return succeed({ uploadUrl: ticket.uploadUrl, headers: ticket.headers });
  });
}

export async function completeAgreementUploadAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.INVOICES_CREATE);
    await completeAgreementUpload(id);
    await refreshData('contracts');
    return succeed(undefined, t('clients.agreements.pdfUploaded'));
  });
}

export async function signAgreementAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.INVOICES_VIEW);
    const parsed = parseInput(signContractSchema, raw);
    if (!parsed.ok) return parsed.result;
    const agreement = await signAgreement(id, parsed.data);
    await recordAudit({
      action: 'contract.signed',
      entityType: 'contract',
      entityId: agreement.id,
      entityLabel: agreement.title,
      summary: `Signed by ${parsed.data.signerName}`,
    });
    await refreshData('contracts');
    return succeed(undefined, t('clients.agreements.signed'));
  });
}

export async function downloadAgreementAction(id: string): Promise<ActionResult<{ url: string }>> {
  return guarded(async () => {
    await authorize(Permissions.INVOICES_VIEW);
    const { url } = await agreementDownloadUrl(id);
    return succeed({ url });
  });
}
