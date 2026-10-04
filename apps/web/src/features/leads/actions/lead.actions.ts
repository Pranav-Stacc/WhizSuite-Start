'use server';

import { createLeadSchema, type CreateLeadInput } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { dateKeyToIso, toMinorUnits } from '@/shared/lib/format';
import { patchLead } from '@/shared/api/live/mutations';
import { isLiveMode } from '@/shared/config/env';
import { recordAudit } from '@/features/audit/services/audit.service';
import { onboardClient } from '@/features/clients/services/clients.service';
import { LeadStages, leadsRepository, type Lead, type LeadStage } from '../data/leads.repository';

const DEFAULT_SOURCE = 'Direct';

async function authorize() {
  const session = await requireSession();
  if (!ROLES_LEADERSHIP.includes(session.role)) throw new Error('forbidden');
  return session;
}

function toLeadFields(input: CreateLeadInput): Omit<Lead, 'id' | 'stage' | 'createdAt' | 'ownerId' | 'convertedClientId'> {
  return {
    company: input.companyName,
    contact: input.contactName ?? '',
    email: input.contactEmail ?? '',
    industry: input.industry ?? '',
    website: input.website,
    source: input.source ?? DEFAULT_SOURCE,
    valueMinor: toMinorUnits(input.estimatedValue ?? 0),
    nextStep: input.nextStep ?? '',
    nextStepAt: input.nextStepAt ? dateKeyToIso(input.nextStepAt) : undefined,
  };
}

export async function createLeadAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createLeadSchema, raw);
    if (!parsed.ok) return parsed.result;
    const lead = await leadsRepository.create({
      ...toLeadFields(parsed.data),
      stage: 'NEW',
      ownerId: parsed.data.ownerId ?? session.userId,
      createdAt: new Date().toISOString(),
    });
    await recordAudit({ action: 'lead.created', entityType: 'lead', entityId: lead.id, entityLabel: lead.company, summary: 'Created lead' });
    await refreshData('leads');
    return succeed(undefined, t('leads.created'));
  });
}

export async function updateLeadAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createLeadSchema, raw);
    if (!parsed.ok) return parsed.result;
    const before = await leadsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await leadsRepository.update(id, { ...toLeadFields(parsed.data), ownerId: parsed.data.ownerId ?? session.userId });
    await recordAudit({ action: 'lead.updated', entityType: 'lead', entityId: id, entityLabel: parsed.data.companyName, summary: 'Updated lead' });
    await refreshData('leads');
    return succeed(undefined, t('leads.updated'));
  });
}

export async function moveLeadAction(id: string, stage: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    if (!LeadStages.includes(stage as LeadStage)) return fail(t('toast.failed'));
    const before = await leadsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (isLiveMode) await patchLead(id, { stage });
    else await leadsRepository.update(id, { stage: stage as LeadStage });
    await recordAudit({
      action: 'lead.stage_changed',
      entityType: 'lead',
      entityId: id,
      entityLabel: before.company,
      summary: `Moved lead to ${t(`status.lead.${stage as LeadStage}`)}`,
      diff: { stage: { from: before.stage, to: stage } },
    });
    await refreshData('leads');
    return succeed();
  });
}

export async function convertLeadAction(id: string): Promise<ActionResult<{ href: string }>> {
  return guarded(async () => {
    const session = await authorize();
    const lead = await leadsRepository.get(id);
    if (!lead) return fail(t('toast.failed'));
    if (lead.convertedClientId) return fail(t('leads.convert.already'));

    const client = await onboardClient({
      name: lead.company,
      ownerId: lead.ownerId || session.userId,
      industry: lead.industry,
      website: lead.website,
      contactName: lead.contact,
      contactEmail: lead.email,
      retainerMinor: lead.valueMinor,
    });
    await leadsRepository.update(id, { stage: 'WON', convertedClientId: client.id });
    await recordAudit({ action: 'lead.converted', entityType: 'lead', entityId: id, entityLabel: lead.company, summary: 'Converted lead to client', diff: { client: { to: client.id } } });
    await recordAudit({ action: 'client.created', entityType: 'client', entityId: client.id, entityLabel: client.name, summary: 'Created client from lead' });
    await refreshData('leads', 'clients');
    return succeed({ href: `/clients/${client.id}` }, t('leads.convert.done', { name: lead.company }));
  });
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await leadsRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await leadsRepository.remove(id);
    await recordAudit({ action: 'lead.deleted', entityType: 'lead', entityId: id, entityLabel: before.company, summary: 'Deleted lead' });
    await refreshData('leads');
    return succeed(undefined, t('leads.deleted'));
  });
}
