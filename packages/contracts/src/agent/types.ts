import { z } from 'zod';

export const AgentRunStatuses = [
  'QUEUED',
  'RUNNING',
  'WAITING_CONFIRMATION',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export type AgentRunStatus = (typeof AgentRunStatuses)[number];

export const AgentMessageRoles = ['user', 'assistant', 'system', 'tool'] as const;
export type AgentMessageRole = (typeof AgentMessageRoles)[number];

export const AgentScheduleStatuses = ['ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
export type AgentScheduleStatus = (typeof AgentScheduleStatuses)[number];

export const agentChatMessageSchema = z.object({
  role: z.enum(AgentMessageRoles),
  content: z.string(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        toolId: z.string(),
        input: z.record(z.unknown()),
      }),
    )
    .optional(),
});

export type AgentChatMessage = z.infer<typeof agentChatMessageSchema>;

export interface AgentSessionDto {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunDto {
  id: string;
  sessionId: string;
  status: AgentRunStatus;
  prompt: string;
  response: string | null;
  error: string | null;
  agentDefinitionId: string | null;
  scheduleId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AgentRunStepDto {
  id: string;
  runId: string;
  agentName: string;
  stepType: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AgentPendingActionDto {
  id: string;
  runId: string;
  toolId: string;
  input: Record<string, unknown>;
  summary: string;
  expiresAt: string;
  createdAt: string;
}

export interface AgentDefinitionDto {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  toolIds: string[];
  subAgents: Array<{ name: string; role: string }>;
  createdAt: string;
}

export interface AgentScheduleDto {
  id: string;
  name: string;
  prompt: string;
  cron: string;
  timezone: string;
  status: AgentScheduleStatus;
  agentDefinitionId: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

export const sendAgentMessageSchema = z.object({
  message: z.string().min(1).max(20_000),
  agentDefinitionId: z.string().uuid().optional(),
  /** Use multi-agent supervisor when true. */
  multiAgent: z.boolean().optional(),
});

export type SendAgentMessageInput = z.infer<typeof sendAgentMessageSchema>;
