import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

export const AUTOMATION_EXECUTION_QUEUE = 'automation-execution';

export interface AutomationExecutionJob {
  organizationId: string;
  runId: string;
  actorId: string;
  membershipId?: string;
  permissions?: string[];
}

@Injectable()
export class AutomationExecutionQueue {
  constructor(
    @InjectQueue(AUTOMATION_EXECUTION_QUEUE) private readonly queue: Queue,
  ) {}

  enqueue(job: AutomationExecutionJob) {
    return this.queue.add('execute', job, {
      jobId: `automation:${job.runId}`,
      removeOnComplete: 200,
      removeOnFail: 200,
    });
  }
}
