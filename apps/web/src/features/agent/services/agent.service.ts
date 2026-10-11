import 'server-only';
import type {
  AgentDefinitionDto,
  AgentPendingActionDto,
  AgentRunDto,
  AgentScheduleDto,
  AgentSessionDto,
} from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';

const base = (orgId: string) => orgPath(orgId, 'agent');
const tags = (orgId: string) => [`org:${orgId}:agent`];

export async function listAgentSessions(orgId: string): Promise<AgentSessionDto[]> {
  const rows = await apiFetch<AgentSessionDto[]>(`${base(orgId)}/sessions`, { tags: tags(orgId) });
  return Array.isArray(rows) ? rows : [];
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
  }>(`${base(orgId)}/sessions/${sessionId}`, { tags: tags(orgId) });
}

export async function listAgentRuns(orgId: string): Promise<AgentRunDto[]> {
  const rows = await apiFetch<AgentRunDto[]>(`${base(orgId)}/runs`, { tags: tags(orgId) });
  return Array.isArray(rows) ? rows : [];
}

export async function listAgentPending(orgId: string): Promise<AgentPendingActionDto[]> {
  const rows = await apiFetch<AgentPendingActionDto[]>(`${base(orgId)}/pending`, { tags: tags(orgId) });
  return Array.isArray(rows) ? rows : [];
}

export async function confirmAgentPending(orgId: string, pendingId: string) {
  return apiFetch(`${base(orgId)}/pending/${pendingId}/confirm`, { method: 'POST' });
}

export async function rejectAgentPending(orgId: string, pendingId: string) {
  return apiFetch(`${base(orgId)}/pending/${pendingId}/reject`, { method: 'POST' });
}

export async function listAgentDefinitions(orgId: string): Promise<AgentDefinitionDto[]> {
  try {
    const rows = await apiFetch<AgentDefinitionDto[]>(`${base(orgId)}/definitions`, { tags: tags(orgId) });
    return Array.isArray(rows) ? rows : [];
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
    const rows = await apiFetch<AgentScheduleDto[]>(`${base(orgId)}/schedules`, { tags: tags(orgId) });
    return Array.isArray(rows) ? rows : [];
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
