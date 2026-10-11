import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../shared/config/app.config';
import { nextCronRun } from '../../../shared/utils/cron.util';
import { AgentRepository } from '../infrastructure/repositories/agent.repository';
import { AgentRunQueue } from './agent-run.queue';

@Injectable()
export class AgentSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AgentSchedulerService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly repo: AgentRepository,
    private readonly queue: AgentRunQueue,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('AGENT_SCHEDULER_ENABLED', { infer: true })) return;
    const interval = this.config.get('AGENT_SCHEDULER_POLL_MS', {
      infer: true,
    });
    this.timer = setInterval(() => void this.poll(), interval);
    this.logger.log(`Agent scheduler polling every ${interval}ms`);
  }

  private async poll(): Promise<void> {
    const limit = this.config.get('AGENT_SCHEDULER_BATCH', { infer: true });
    const due = await this.repo.listDueSchedules(new Date(), limit);
    for (const schedule of due) {
      await this.queue.enqueueScheduledRun({
        scheduleId: schedule.id,
        organizationId: schedule.organizationId,
        userId: schedule.createdById,
        prompt: schedule.prompt,
        agentDefinitionId: schedule.agentDefinitionId,
      });
      const next = nextCronRun(schedule.cron, schedule.timezone, new Date());
      await this.repo.updateSchedule(schedule.id, {
        lastRunAt: new Date(),
        nextRunAt: next,
      });
    }
  }
}
