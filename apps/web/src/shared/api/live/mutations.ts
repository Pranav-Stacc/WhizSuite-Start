import 'server-only';
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

export async function patchLead(leadId: string, body: Record<string, unknown>): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'leads')}/${leadId}`, { method: 'PATCH', body });
}

export async function patchClientBrandKit(clientId: string, body: Record<string, unknown>): Promise<void> {
  const org = await orgId();
  await apiFetch(`${orgPath(org, 'clients')}/${clientId}/brand-kit`, { method: 'PATCH', body });
}

export async function inviteMember(email: string, membershipType: string): Promise<void> {
  const org = await orgId();
  await apiFetch(orgPath(org, 'invitations'), {
    method: 'POST',
    body: { email, membershipType, roleIds: [] },
  });
}
