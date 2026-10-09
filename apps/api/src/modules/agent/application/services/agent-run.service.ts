import { Injectable } from '@nestjs/common';
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
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentSessionService } from './agent-session.service';

@Injectable()
export class AgentRunService {
  constructor(
    private readonly repo: AgentRepository,
    private readonly sessions: AgentSessionService,
    private readonly orchestrator: AgentOrchestratorService,
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
    const session = await this.repo.findSession(organizationId, sessionId);
    if (!session || session.userId !== user.userId) throw notFound();

    await this.repo.addMessage(organizationId, sessionId, 'user', input.message);
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
    const result = await this.orchestrator.run({
      runToken,
      sessionId,
      runId: run.id,
      message: input.message,
      multiAgent: input.multiAgent ?? true,
      systemPrompt: definition?.systemPrompt,
      subAgents: (definition?.subAgents as Array<{ name: string; role: string }>) ?? undefined,
      toolIds: (definition?.toolIds as string[]) ?? undefined,
    });

    for (const step of result.steps) {
      await this.repo.createRunStep({
        organizationId,
        runId: run.id,
        agentName: step.agentName,
        stepType: step.stepType,
        input: step.input,
        output: step.output,
        status: step.status,
      });
    }

    const status = result.pendingActionId ? 'WAITING_CONFIRMATION' : 'COMPLETED';
    await this.repo.updateRun(run.id, {
      status,
      response: result.response,
      completedAt: status === 'COMPLETED' ? new Date() : undefined,
    });

    await this.repo.addMessage(organizationId, sessionId, 'assistant', result.response, {
      runId: run.id,
      steps: result.steps.length,
    });

    await this.outbox.write({
      type:
        status === 'COMPLETED'
          ? AgentEventTypes.AGENT_RUN_COMPLETED
          : AgentEventTypes.AGENT_PENDING_ACTION,
      version: 1,
      organizationId,
      payload: { runId: run.id, pendingActionId: result.pendingActionId },
      actor: { id: user.userId, type: 'user' },
    });

    const updated = await this.repo.findRun(organizationId, run.id);
    return {
      run: this.toRunDto(updated ?? run),
      response: result.response,
      pendingActionId: result.pendingActionId,
    };
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
    const pending = await this.repo.findPendingAction(organizationId, pendingId);
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

  async rejectPending(organizationId: string, userId: string, pendingId: string) {
    const pending = await this.repo.findPendingAction(organizationId, pendingId);
    if (!pending || pending.userId !== userId) throw notFound();
    await this.repo.resolvePendingAction(pendingId, 'REJECTED');
    await this.repo.updateRun(pending.runId, {
      status: 'CANCELLED',
      completedAt: new Date(),
      error: 'Action rejected by user',
    });
    return { status: 'rejected' };
  }

  createDefinition(
    organizationId: string,
    userId: string,
    raw: unknown,
  ) {
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
    const nextRunAt = new Date(Date.now() + 60_000);
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
