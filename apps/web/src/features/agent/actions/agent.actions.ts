'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/shared/auth/session';
import {
  confirmAgentPending,
  createAgentDefinition,
  createAgentSchedule,
  createAgentSession,
  rejectAgentPending,
  sendAgentMessage,
  updateAgentScheduleStatus,
} from '../services/agent.service';

async function orgId(): Promise<string> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('Not authenticated');
  return session.orgId;
}

export async function createSessionAction(title?: string) {
  const created = await createAgentSession(await orgId(), title);
  revalidatePath('/agent');
  return created;
}

export async function sendMessageAction(
  sessionId: string,
  message: string,
  multiAgent = true,
  agentDefinitionId?: string,
) {
  const result = await sendAgentMessage(await orgId(), sessionId, message, {
    multiAgent,
    agentDefinitionId,
  });
  revalidatePath('/agent');
  revalidatePath(`/agent?session=${sessionId}`);
  return result;
}

export async function confirmPendingAction(pendingId: string) {
  const result = await confirmAgentPending(await orgId(), pendingId);
  revalidatePath('/agent');
  return result;
}

export async function rejectPendingAction(pendingId: string) {
  const result = await rejectAgentPending(await orgId(), pendingId);
  revalidatePath('/agent');
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
  revalidatePath('/agent');
}

export async function createScheduleAction(formData: FormData) {
  await createAgentSchedule(await orgId(), {
    name: String(formData.get('name') ?? '').trim(),
    prompt: String(formData.get('prompt') ?? '').trim(),
    cron: String(formData.get('cron') ?? '').trim(),
    timezone: String(formData.get('timezone') ?? 'UTC').trim() || 'UTC',
    agentDefinitionId: String(formData.get('agentDefinitionId') ?? '').trim() || undefined,
  });
  revalidatePath('/agent');
}

export async function pauseScheduleAction(scheduleId: string) {
  await updateAgentScheduleStatus(await orgId(), scheduleId, 'PAUSED');
  revalidatePath('/agent');
}

export async function resumeScheduleAction(scheduleId: string) {
  await updateAgentScheduleStatus(await orgId(), scheduleId, 'ACTIVE');
  revalidatePath('/agent');
}
