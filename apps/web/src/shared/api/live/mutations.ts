import 'server-only';
import type { ContentReviewOutcome } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { orgPath } from './utils';

async function orgId(): Promise<string> {
  return (await getSession())?.orgId ?? '';
}

export async function transitionTask(taskId: string, toStatus: string): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'tasks')}/${taskId}/transition`, { method: 'POST', body: { toStatus } });
}

export async function transitionContent(contentId: string, toStatus: string): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'content')}/${contentId}/transition`, { method: 'POST', body: { toStatus } });
}

export async function reviewContent(contentId: string, toStatus: ContentReviewOutcome): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'content')}/${contentId}/review`, { method: 'POST', body: { toStatus } });
}

export async function reorderContent(clientId: string, orderedIds: string[]): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'content')}/reorder`, { method: 'POST', body: { clientId, orderedIds } });
}

export async function patchLead(leadId: string, body: Record<string, unknown>): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'leads')}/${leadId}`, { method: 'PATCH', body });
}

export async function patchClient(clientId: string, body: Record<string, unknown>): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'clients')}/${clientId}`, { method: 'PATCH', body });
}

export async function patchClientBrandKit(clientId: string, body: Record<string, unknown>): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'clients')}/${clientId}/brand-kit`, { method: 'PATCH', body });
}

export async function runAutomation(automationId: string, detail: string): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'automations')}/${automationId}/run`, { method: 'POST', body: { detail } });
}

export interface InvitationCreated {
  invitationId: string;
  acceptUrl: string;
}

export async function inviteMember(email: string, membershipType: string, clientId?: string): Promise<InvitationCreated> {
  const org = await orgId();
  return apiFetch<InvitationCreated>(orgPath(org, 'invitations'), {
    method: 'POST',
    body: { email, membershipType, clientId },
  });
}
