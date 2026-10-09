import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { Permission } from '@agency-os/contracts';
import { AutomationExecutionService } from '../application/services/automation-execution.service';
import {
  AUTOMATION_EXECUTION_QUEUE,
  type AutomationExecutionJob,
} from './automation-execution.queue';

@Processor(AUTOMATION_EXECUTION_QUEUE)
export class AutomationExecutionProcessor extends WorkerHost {
  constructor(private readonly execution: AutomationExecutionService) {
    super();
  }

  async process(job: Job<AutomationExecutionJob>): Promise<void> {
    const data = job.data;
    await this.execution.executeRun(data.organizationId, data.runId, {
      userId: data.actorId,
      email: '',
      membershipId: data.membershipId,
      organizationId: data.organizationId,
      permissions: data.permissions as Permission[] | undefined,
    });
  }
}
