import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';

export interface AgentHistoryMessage {
  role: string;
  content: string;
}

export interface AgentOrchestratorRequest {
  runToken: string;
  sessionId: string;
  runId: string;
  message: string;
  multiAgent?: boolean;
  systemPrompt?: string;
  subAgents?: Array<{ name: string; role: string }>;
  toolIds?: string[];
  history?: AgentHistoryMessage[];
}

export interface AgentOrchestratorStep {
  agentName: string;
  stepType: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: string;
}

function eventText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export interface AgentOrchestratorResponse {
  response: string;
  steps: AgentOrchestratorStep[];
  pendingActionId?: string;
}

export type AgentStreamCallback = (
  event: Record<string, unknown>,
) => void | Promise<void>;

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async run(
    request: AgentOrchestratorRequest,
  ): Promise<AgentOrchestratorResponse> {
    const baseUrl = this.config.get('AGENT_SERVICE_URL', { infer: true });
    const url = `${baseUrl.replace(/\/$/, '')}/v1/run`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.runToken}`,
        },
        body: JSON.stringify(this.toBody(request)),
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

      return (await res.json()) as AgentOrchestratorResponse;
    } catch (error) {
      this.logger.warn(`Agent service unavailable: ${String(error)}`);
      return this.failureResponse(
        'The AI runtime is unreachable right now. Please try again in a moment.',
      );
    }
  }

  /**
   * Streams SSE events from the Python runtime. Invokes `onEvent` for each
   * parsed event. Returns the final orchestrator response once `done` arrives.
   */
  async runStream(
    request: AgentOrchestratorRequest,
    onEvent: AgentStreamCallback,
  ): Promise<AgentOrchestratorResponse> {
    const baseUrl = this.config.get('AGENT_SERVICE_URL', { infer: true });
    const url = `${baseUrl.replace(/\/$/, '')}/v1/run/stream`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${request.runToken}`,
        },
        body: JSON.stringify(this.toBody(request)),
        signal: AbortSignal.timeout(
          this.config.get('AGENT_SERVICE_TIMEOUT_MS', { infer: true }),
        ),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Agent stream error ${res.status}: ${text}`);
        const failure = this.failureResponse(
          `The AI runtime returned ${res.status}. ${this.safeDetail(text)}`,
        );
        await onEvent({ type: 'error', message: failure.response });
        return failure;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let final: AgentOrchestratorResponse | null = null;

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (chunk.value) {
          buffer += decoder.decode(chunk.value, { stream: true });
        }
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const line = chunk
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.startsWith('data:'));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(payload) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (event.type === 'done') {
            const steps = Array.isArray(event.steps)
              ? (event.steps as AgentOrchestratorStep[])
              : [];
            final = {
              response: eventText(event.response, ''),
              steps,
              pendingActionId:
                typeof event.pendingActionId === 'string'
                  ? event.pendingActionId
                  : undefined,
            };
            // Strip internal steps before forwarding to clients.
            const publicDone = { ...event };
            delete publicDone.steps;
            await onEvent({
              ...publicDone,
              type: 'done',
              response: final.response,
              pendingActionId: final.pendingActionId,
              stepCount: steps.length,
              runId: request.runId,
            });
          } else {
            await onEvent(event);
            if (event.type === 'error') {
              return this.failureResponse(
                eventText(event.message, 'Agent failed'),
              );
            }
          }
        }
      }

      return (
        final ??
        this.failureResponse(
          'The AI runtime closed the stream without a result.',
        )
      );
    } catch (error) {
      this.logger.warn(`Agent stream unavailable: ${String(error)}`);
      const failure = this.failureResponse(
        'The AI runtime is unreachable right now. Please try again in a moment.',
      );
      await onEvent({ type: 'error', message: failure.response });
      return failure;
    }
  }

  private toBody(request: AgentOrchestratorRequest) {
    return {
      session_id: request.sessionId,
      run_id: request.runId,
      message: request.message,
      multi_agent: request.multiAgent ?? false,
      system_prompt: request.systemPrompt,
      sub_agents: request.subAgents,
      tool_ids: request.toolIds,
      history: request.history ?? [],
    };
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
