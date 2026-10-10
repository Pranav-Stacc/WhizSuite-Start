import 'server-only';
import type {
  AgentDefinitionDto,
  AgentPendingActionDto,
  AgentRunDto,
  AgentScheduleDto,
  AgentSessionDto,
  CapabilityToolDescriptor,
} from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';

const base = (orgId: string) => orgPath(orgId, 'agent');

export async function listAgentSessions(orgId: string): Promise<AgentSessionDto[]> {
  return apiFetch(`${base(orgId)}/sessions`);
}

export async function createAgentSession(orgId: string, title?: string): Promise<AgentSessionDto> {
  return apiFetch(`${base(orgId)}/sessions`, { method: 'POST', body: { title } });
}

export async function getAgentSession(orgId: string, sessionId: string) {
  return apiFetch<{
    id: string;
    title: string | null;
    messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
    createdAt: string;
    updatedAt: string;
  }>(`${base(orgId)}/sessions/${sessionId}`);
}

export async function sendAgentMessage(
  orgId: string,
  sessionId: string,
  message: string,
  options: { multiAgent?: boolean; agentDefinitionId?: string } = {},
) {
  return apiFetch<{ run: AgentRunDto; response: string; pendingActionId?: string }>(
    `${base(orgId)}/sessions/${sessionId}/messages`,
    {
      method: 'POST',
      body: {
        message,
        multiAgent: options.multiAgent ?? true,
        agentDefinitionId: options.agentDefinitionId,
      },
      timeoutMs: 180_000,
    },
  );
}

export async function listAgentRuns(orgId: string): Promise<AgentRunDto[]> {
  return apiFetch(`${base(orgId)}/runs`);
}

export async function listAgentPending(orgId: string): Promise<AgentPendingActionDto[]> {
  return apiFetch(`${base(orgId)}/pending`);
}

export async function confirmAgentPending(orgId: string, pendingId: string) {
  return apiFetch(`${base(orgId)}/pending/${pendingId}/confirm`, { method: 'POST' });
}

export async function rejectAgentPending(orgId: string, pendingId: string) {
  return apiFetch(`${base(orgId)}/pending/${pendingId}/reject`, { method: 'POST' });
}

export async function listCapabilities(orgId: string): Promise<CapabilityToolDescriptor[]> {
  return apiFetch(orgPath(orgId, 'capabilities'));
}

export async function listAgentDefinitions(orgId: string): Promise<AgentDefinitionDto[]> {
  try {
    return await apiFetch(`${base(orgId)}/definitions`);
  } catch {
    return [];
  }
}

export async function createAgentDefinition(
  orgId: string,
  input: {
    name: string;
    description?: string;
    systemPrompt: string;
    toolIds?: string[];
    subAgents?: Array<{ name: string; role: string }>;
  },
): Promise<AgentDefinitionDto> {
  return apiFetch(`${base(orgId)}/definitions`, { method: 'POST', body: input });
}

export async function listAgentSchedules(orgId: string): Promise<AgentScheduleDto[]> {
  try {
    return await apiFetch(`${base(orgId)}/schedules`);
  } catch {
    return [];
  }
}

export async function createAgentSchedule(
  orgId: string,
  input: {
    name: string;
    prompt: string;
    cron: string;
    timezone?: string;
    agentDefinitionId?: string;
  },
): Promise<AgentScheduleDto> {
  return apiFetch(`${base(orgId)}/schedules`, { method: 'POST', body: input });
}

export async function updateAgentScheduleStatus(
  orgId: string,
  scheduleId: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
): Promise<AgentScheduleDto> {
  return apiFetch(`${base(orgId)}/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: { status },
  });
}
