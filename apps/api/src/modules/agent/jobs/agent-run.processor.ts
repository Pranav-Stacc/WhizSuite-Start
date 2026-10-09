import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AgentRepository } from '../infrastructure/repositories/agent.repository';
import { AgentOrchestratorService } from '../application/services/agent-orchestrator.service';
import { AgentSessionService } from '../application/services/agent-session.service';
import {
  AGENT_RUN_QUEUE,
  type AgentRunJob,
  type ScheduledAgentRunJob,
} from './agent-run.queue';

@Processor(AGENT_RUN_QUEUE)
export class AgentRunProcessor extends WorkerHost {
  constructor(
    private readonly repo: AgentRepository,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly sessions: AgentSessionService,
  ) {
    super();
  }

  async process(job: Job<AgentRunJob | ScheduledAgentRunJob>): Promise<void> {
    if (job.name === 'scheduled') {
      await this.processScheduled(job as Job<ScheduledAgentRunJob>);
      return;
    }
    await this.processRun(job as Job<AgentRunJob>);
  }

  private async processScheduled(job: Job<ScheduledAgentRunJob>): Promise<void> {
    const data = job.data;
    const session = await this.repo.createSession(
      data.organizationId,
      data.userId,
      `Scheduled: ${data.scheduleId}`,
    );
    await this.processRun({
      ...job,
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        sessionId: session.id,
        prompt: data.prompt,
        scheduleId: data.scheduleId,
        agentDefinitionId: data.agentDefinitionId,
        multiAgent: true,
      },
    } as Job<AgentRunJob>);
  }

  private async processRun(job: Job<AgentRunJob>): Promise<void> {
    const data = job.data;
    const sessionId =
      data.sessionId ??
      (await this.repo.createSession(data.organizationId, data.userId)).id;

    const run = await this.repo.createRun({
      organizationId: data.organizationId,
      sessionId,
      userId: data.userId,
      prompt: data.prompt,
      scheduleId: data.scheduleId,
      agentDefinitionId: data.agentDefinitionId ?? undefined,
      multiAgent: data.multiAgent,
    });

    const runToken = this.sessions.mintRunToken(
      {
        userId: data.userId,
        email: '',
        organizationId: data.organizationId,
      },
      run.id,
    );

    const result = await this.orchestrator.run({
      runToken,
      sessionId,
      runId: run.id,
      message: data.prompt,
      multiAgent: data.multiAgent,
    });

    await this.repo.updateRun(run.id, {
      status: 'COMPLETED',
      response: result.response,
      completedAt: new Date(),
    });
  }
}
