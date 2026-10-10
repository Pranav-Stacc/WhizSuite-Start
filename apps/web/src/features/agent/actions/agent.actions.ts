'use server';

import { getSession } from '@/shared/auth/session';
import { refreshData, refreshPage } from '@/shared/data/refresh';
import {
  confirmAgentPending,
  createAgentDefinition,
  createAgentSchedule,
  createAgentSession,
  rejectAgentPending,
  updateAgentScheduleStatus,
} from '../services/agent.service';

async function orgId(): Promise<string> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('Not authenticated');
  return session.orgId;
}

async function refreshAgentSurfaces(sessionId?: string) {
  await refreshData('agent', 'chat');
  await refreshPage('/agent');
  await refreshPage('/chat');
  if (sessionId) {
    await refreshPage(`/agent?session=${sessionId}`);
    await refreshPage(`/chat?whiz=1&session=${sessionId}`);
  }
}

export async function createSessionAction(title?: string) {
  const created = await createAgentSession(await orgId(), title);
  await refreshAgentSurfaces(created.id);
  return created;
}

export async function confirmPendingAction(pendingId: string) {
  const result = await confirmAgentPending(await orgId(), pendingId);
  await refreshData('agent');
  return result;
}

export async function rejectPendingAction(pendingId: string) {
  const result = await rejectAgentPending(await orgId(), pendingId);
  await refreshData('agent');
  return result;
}

export async function createDefinitionAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const systemPrompt = String(formData.get('systemPrompt') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || undefined;
  const subAgentsRaw = String(formData.get('subAgents') ?? '').trim();
  const subAgents = subAgentsRaw
    ? subAgentsRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [agentName, ...rest] = line.split(':');
          return { name: agentName.trim(), role: rest.join(':').trim() || agentName.trim() };
        })
    : undefined;

  await createAgentDefinition(await orgId(), {
    name,
    systemPrompt,
    description,
    subAgents,
  });
  await refreshData('agent');
  await refreshPage('/agent');
}

export async function createScheduleAction(formData: FormData) {
  await createAgentSchedule(await orgId(), {
    name: String(formData.get('name') ?? '').trim(),
    prompt: String(formData.get('prompt') ?? '').trim(),
    cron: String(formData.get('cron') ?? '').trim(),
    timezone: String(formData.get('timezone') ?? 'UTC').trim() || 'UTC',
    agentDefinitionId: String(formData.get('agentDefinitionId') ?? '').trim() || undefined,
  });
  await refreshData('agent');
  await refreshPage('/agent');
}

export async function pauseScheduleAction(scheduleId: string) {
  await updateAgentScheduleStatus(await orgId(), scheduleId, 'PAUSED');
  await refreshData('agent');
  await refreshPage('/agent');
}

export async function resumeScheduleAction(scheduleId: string) {
  await updateAgentScheduleStatus(await orgId(), scheduleId, 'ACTIVE');
  await refreshData('agent');
  await refreshPage('/agent');
}
