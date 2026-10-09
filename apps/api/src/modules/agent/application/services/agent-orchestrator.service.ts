import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';

export interface AgentOrchestratorRequest {
  runToken: string;
  sessionId: string;
  runId: string;
  message: string;
  multiAgent?: boolean;
  systemPrompt?: string;
  subAgents?: Array<{ name: string; role: string }>;
  toolIds?: string[];
}

export interface AgentOrchestratorResponse {
  response: string;
  steps: Array<{
    agentName: string;
    stepType: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    status: string;
  }>;
  pendingActionId?: string;
}

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async run(request: AgentOrchestratorRequest): Promise<AgentOrchestratorResponse> {
    const baseUrl = this.config.get('AGENT_SERVICE_URL', { infer: true });
    const url = `${baseUrl.replace(/\/$/, '')}/v1/run`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.runToken}`,
        },
        body: JSON.stringify({
          session_id: request.sessionId,
          run_id: request.runId,
          message: request.message,
          multi_agent: request.multiAgent ?? false,
          system_prompt: request.systemPrompt,
          sub_agents: request.subAgents,
          tool_ids: request.toolIds,
        }),
        signal: AbortSignal.timeout(
          this.config.get('AGENT_SERVICE_TIMEOUT_MS', { infer: true }),
        ),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Agent service error ${res.status}: ${text}`);
        return this.fallbackResponse(request.message);
      }

      const data = (await res.json()) as AgentOrchestratorResponse;
      return data;
    } catch (error) {
      this.logger.warn(`Agent service unavailable: ${String(error)}`);
      return this.fallbackResponse(request.message);
    }
  }

  /** Local fallback when Python agent is offline — still routes through capabilities via instructions. */
  private fallbackResponse(message: string): AgentOrchestratorResponse {
    return {
      response:
        `Agent runtime is starting up. Your request was recorded: "${message.slice(0, 200)}". ` +
        'Connect apps/agent or set AGENT_SERVICE_URL for full LangGraph multi-agent execution.',
      steps: [
        {
          agentName: 'supervisor',
          stepType: 'fallback',
          status: 'COMPLETED',
          output: { offline: true },
        },
      ],
    };
  }
}
