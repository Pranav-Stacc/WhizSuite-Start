import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentEventTypes,
  agentDefinitionCreateInput,
  agentScheduleCreateInput,
  type SendAgentMessageInput,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { CapabilityExecutorService } from '../../../capabilities/application/services/capability-executor.service';
import { AgentRepository } from '../../infrastructure/repositories/agent.repository';
import { nextCronRun } from '../../../../shared/utils/cron.util';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentSessionService } from './agent-session.service';

/** Plain-text voice for @Whiz replies posted into team chat rooms. */
const CHAT_ROOM_WHIZ_SUMMARY_PROMPT = `
You are Whiz replying in a team chat thread after someone @mentioned you.

Format rules (strict):
- Plain text only — no markdown, no headings, no bullet lists, no code fences.
- Never use section titles like "Summary", "Next steps", "What I did", or similar.
- Reply in 1–4 short, conversational sentences, like a helpful coworker in Slack.
- If tools ran, weave the outcome into natural prose; do not list tools.
- If something failed or needs approval, say so plainly in one sentence.
`.trim();

@Injectable()
export class AgentRunService {
  constructor(
    private readonly repo: AgentRepository,
    private readonly sessions: AgentSessionService,
    private readonly orchestrator: AgentOrchestratorService,
    @Inject(forwardRef(() => CapabilityExecutorService))
    private readonly capabilities: CapabilityExecutorService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async sendMessage(
    organizationId: string,
    user: AuthenticatedUser,
    sessionId: string,
    input: SendAgentMessageInput,
  ) {
    const prepared = await this.prepareRun(
      organizationId,
      user,
      sessionId,
      input,
    );
    const result = await this.orchestrator.run(prepared.orchestratorRequest);
    return this.finalizeRun(organizationId, user, prepared, result);
  }

  /** Non-streaming agent run with a short plain-text reply for in-room @Whiz mentions. */
  async sendRoomWhizMessage(
    organizationId: string,
    user: AuthenticatedUser,
    sessionId: string,
    message: string,
  ) {
    const prepared = await this.prepareRun(organizationId, user, sessionId, {
      message,
      multiAgent: false,
    });
    const result = await this.orchestrator.run({
      ...prepared.orchestratorRequest,
      multiAgent: false,
      summaryPrompt: CHAT_ROOM_WHIZ_SUMMARY_PROMPT,
    });
    return this.finalizeRun(organizationId, user, prepared, result);
  }

  /**
   * Streams progressive agent events to onEvent, then persists the completed run.
   */
  async sendMessageStream(
    organizationId: string,
    user: AuthenticatedUser,
    sessionId: string,
    input: SendAgentMessageInput,
    onEvent: (event: Record<string, unknown>) => void | Promise<void>,
  ) {
    const prepared = await this.prepareRun(
      organizationId,
      user,
      sessionId,
      input,
    );
    try {
      await onEvent({
        type: 'status',
        phase: 'thinking',
        detail: 'Connecting tools',
        runId: prepared.run.id,
      });

      const result = await this.orchestrator.runStream(
        prepared.orchestratorRequest,
        onEvent,
      );
      return await this.finalizeRun(organizationId, user, prepared, result);
    } catch (error) {
      await this.markRunFailed(
        prepared.run.id,
        error instanceof Error ? error.message : 'Agent stream failed',
      );
      throw error;
    }
  }

  private async prepareRun(
    organizationId: string,
    user: AuthenticatedUser,
    sessionId: string,
    input: SendAgentMessageInput,
  ) {
    const session = await this.repo.findSession(organizationId, sessionId);
    if (!session || session.userId !== user.userId) throw notFound();

    const history = (session.messages ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    await this.repo.addMessage(
      organizationId,
      sessionId,
      'user',
      input.message,
    );
    const title = session.title ?? input.message.slice(0, 80);
    await this.repo.touchSession(sessionId, session.title ? undefined : title);

    const definition = input.agentDefinitionId
      ? await this.repo.findDefinition(organizationId, input.agentDefinitionId)
      : null;

    const run = await this.repo.createRun({
      organizationId,
      sessionId,
      userId: user.userId,
      prompt: input.message,
      agentDefinitionId: definition?.id,
      multiAgent: input.multiAgent ?? true,
    });

    await this.outbox.write({
      type: AgentEventTypes.AGENT_RUN_STARTED,
      version: 1,
      organizationId,
      payload: { runId: run.id, sessionId },
      actor: { id: user.userId, type: 'user' },
    });

    await this.repo.updateRun(run.id, {
      status: 'RUNNING',
      startedAt: new Date(),
    });

    const runToken = this.sessions.mintRunToken(user, run.id);
    return {
      run,
      sessionId,
      orchestratorRequest: {
        runToken,
        sessionId,
        runId: run.id,
        message: input.message,
        multiAgent: input.multiAgent ?? true,
        systemPrompt: definition?.systemPrompt,
        subAgents:
          (definition?.subAgents as Array<{ name: string; role: string }>) ??
          undefined,
        toolIds: (definition?.toolIds as string[]) ?? undefined,
        history,
      },
    };
  }

  private async finalizeRun(
    organizationId: string,
    user: AuthenticatedUser,
    prepared: {
      run: { id: string };
      sessionId: string;
    },
    result: {
      response: string;
      steps: Array<{
        agentName: string;
        stepType: string;
        input?: Record<string, unknown>;
        output?: Record<string, unknown>;
        status: string;
      }>;
      pendingActionId?: string;
    },
  ) {
    for (const step of result.steps) {
      await this.repo.createRunStep({
        organizationId,
        runId: prepared.run.id,
        agentName: step.agentName,
        stepType: step.stepType,
        input: step.input,
        output: step.output,
        status: step.status,
      });
    }

    const failed = this.isFailedRun(result);
    const status = result.pendingActionId
      ? 'WAITING_CONFIRMATION'
      : failed
        ? 'FAILED'
        : 'COMPLETED';
    await this.repo.updateRun(prepared.run.id, {
      status,
      response: result.response,
      error: failed ? result.response : undefined,
      completedAt:
        status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
    });

    await this.repo.addMessage(
      organizationId,
      prepared.sessionId,
      'assistant',
      result.response,
      {
        runId: prepared.run.id,
        steps: result.steps.length,
        format: 'markdown',
      },
    );

    await this.outbox.write({
      type:
        status === 'COMPLETED'
          ? AgentEventTypes.AGENT_RUN_COMPLETED
          : AgentEventTypes.AGENT_PENDING_ACTION,
      version: 1,
      organizationId,
      payload: {
        runId: prepared.run.id,
        pendingActionId: result.pendingActionId,
      },
      actor: { id: user.userId, type: 'user' },
    });

    const updated = await this.repo.findRun(organizationId, prepared.run.id);
    if (!updated) throw notFound();
    return {
      run: this.toRunDto(updated),
      response: result.response,
      pendingActionId: result.pendingActionId,
    };
  }

  private isFailedRun(result: {
    response: string;
    steps: Array<{ stepType: string; status: string }>;
  }): boolean {
    return result.steps.some(
      (step) => step.stepType === 'error' && step.status === 'FAILED',
    );
  }

  private async markRunFailed(runId: string, message: string) {
    await this.repo.updateRun(runId, {
      status: 'FAILED',
      error: message,
      completedAt: new Date(),
    });
  }

  listRuns(organizationId: string, userId: string) {
    const limit = this.config.get('AGENT_RUN_LIST_LIMIT', { infer: true });
    return this.repo
      .listRuns(organizationId, userId, limit)
      .then((rows) => rows.map((r) => this.toRunDto(r)));
  }

  async getRun(organizationId: string, runId: string) {
    const run = await this.repo.findRun(organizationId, runId);
    if (!run) throw notFound();
    return {
      ...this.toRunDto(run),
      steps: run.steps.map((s) => ({
        id: s.id,
        runId: s.runId,
        agentName: s.agentName,
        stepType: s.stepType,
        input: s.input as Record<string, unknown> | null,
        output: s.output as Record<string, unknown> | null,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
      pendingActions: run.pendingActions.map((p) => ({
        id: p.id,
        runId: p.runId,
        toolId: p.toolId,
        input: p.input as Record<string, unknown>,
        summary: p.summary,
        expiresAt: p.expiresAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  listPending(organizationId: string, userId: string) {
    return this.repo.listPendingActions(organizationId, userId);
  }

  async confirmPending(
    organizationId: string,
    user: AuthenticatedUser,
    pendingId: string,
  ) {
    const pending = await this.repo.findPendingAction(
      organizationId,
      pendingId,
    );
    if (!pending || pending.userId !== user.userId) throw notFound();

    const result = await this.capabilities.execute(organizationId, user, {
      toolId: pending.toolId,
      input: pending.input as Record<string, unknown>,
      pendingActionId: pendingId,
      runId: pending.runId,
    });

    if (result.status === 'ok') {
      await this.repo.updateRun(pending.runId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });
    }

    return result;
  }

  async rejectPending(
    organizationId: string,
    userId: string,
    pendingId: string,
  ) {
    const pending = await this.repo.findPendingAction(
      organizationId,
      pendingId,
    );
    if (!pending || pending.userId !== userId) throw notFound();
    await this.repo.resolvePendingAction(pendingId, 'REJECTED');
    await this.repo.updateRun(pending.runId, {
      status: 'CANCELLED',
      completedAt: new Date(),
      error: 'Action rejected by user',
    });
    return { status: 'rejected' };
  }

  createDefinition(organizationId: string, userId: string, raw: unknown) {
    const input = agentDefinitionCreateInput.parse(raw);
    return this.repo
      .createDefinition({
        organizationId,
        createdById: userId,
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        toolIds: input.toolIds ?? [],
        subAgents: input.subAgents ?? [],
      })
      .then((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        systemPrompt: d.systemPrompt,
        toolIds: d.toolIds as string[],
        subAgents: d.subAgents as Array<{ name: string; role: string }>,
        createdAt: d.createdAt.toISOString(),
      }));
  }

  listDefinitions(organizationId: string) {
    return this.repo.listDefinitions(organizationId).then((rows) =>
      rows.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        systemPrompt: d.systemPrompt,
        toolIds: d.toolIds as string[],
        subAgents: d.subAgents as Array<{ name: string; role: string }>,
        createdAt: d.createdAt.toISOString(),
      })),
    );
  }

  createSchedule(organizationId: string, userId: string, raw: unknown) {
    const input = agentScheduleCreateInput.parse(raw);
    const nextRunAt = nextCronRun(input.cron, input.timezone);
    return this.repo
      .createSchedule({
        organizationId,
        createdById: userId,
        name: input.name,
        prompt: input.prompt,
        cron: input.cron,
        timezone: input.timezone,
        agentDefinitionId: input.agentDefinitionId,
        nextRunAt,
      })
      .then((s) => this.toScheduleDto(s));
  }

  listSchedules(organizationId: string) {
    return this.repo
      .listSchedules(organizationId)
      .then((rows) => rows.map((s) => this.toScheduleDto(s)));
  }

  async updateScheduleStatus(
    organizationId: string,
    scheduleId: string,
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
  ) {
    const existing = await this.repo.findSchedule(organizationId, scheduleId);
    if (!existing) throw notFound();
    await this.repo.updateSchedule(scheduleId, { status });
    const updated = await this.repo.findSchedule(organizationId, scheduleId);
    return this.toScheduleDto(updated!);
  }

  private toRunDto(run: {
    id: string;
    sessionId: string;
    status: string;
    prompt: string;
    response: string | null;
    error: string | null;
    agentDefinitionId: string | null;
    scheduleId: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: run.id,
      sessionId: run.sessionId,
      status: run.status,
      prompt: run.prompt,
      response: run.response,
      error: run.error,
      agentDefinitionId: run.agentDefinitionId,
      scheduleId: run.scheduleId,
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
      createdAt: run.createdAt.toISOString(),
    };
  }

  private toScheduleDto(s: {
    id: string;
    name: string;
    prompt: string;
    cron: string;
    timezone: string;
    status: string;
    agentDefinitionId: string | null;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: s.id,
      name: s.name,
      prompt: s.prompt,
      cron: s.cron,
      timezone: s.timezone,
      status: s.status,
      agentDefinitionId: s.agentDefinitionId,
      lastRunAt: s.lastRunAt?.toISOString() ?? null,
      nextRunAt: s.nextRunAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
