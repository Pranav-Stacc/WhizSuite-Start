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
        return this.failureResponse(
          `The AI runtime returned ${res.status}. ${this.safeDetail(text)}`,
        );
      }

      const data = (await res.json()) as AgentOrchestratorResponse;
      return data;
    } catch (error) {
      this.logger.warn(`Agent service unavailable: ${String(error)}`);
      return this.failureResponse(
        'The AI runtime is unreachable right now. Please try again in a moment.',
      );
    }
  }

  private failureResponse(response: string): AgentOrchestratorResponse {
    return {
      response,
      steps: [
        {
          agentName: 'supervisor',
          stepType: 'error',
          status: 'FAILED',
          output: { offline: true },
        },
      ],
    };
  }

  private safeDetail(text: string): string {
    const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, 240);
    return trimmed || 'Check agent logs for details.';
  }
}
