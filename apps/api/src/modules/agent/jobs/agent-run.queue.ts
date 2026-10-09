import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

export const AGENT_RUN_QUEUE = 'agent-runs';

export interface AgentRunJob {
  organizationId: string;
  userId: string;
  sessionId?: string;
  prompt: string;
  scheduleId?: string;
  agentDefinitionId?: string | null;
  multiAgent?: boolean;
}

export interface ScheduledAgentRunJob {
  scheduleId: string;
  organizationId: string;
  userId: string;
  prompt: string;
  agentDefinitionId?: string | null;
}

@Injectable()
export class AgentRunQueue {
  constructor(@InjectQueue(AGENT_RUN_QUEUE) private readonly queue: Queue) {}

  enqueueRun(job: AgentRunJob) {
    return this.queue.add('run', job, {
      jobId: `${job.organizationId}:${Date.now()}`,
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }

  enqueueScheduledRun(job: ScheduledAgentRunJob) {
    return this.queue.add('scheduled', job, {
      jobId: `schedule:${job.scheduleId}:${Date.now()}`,
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }
}
