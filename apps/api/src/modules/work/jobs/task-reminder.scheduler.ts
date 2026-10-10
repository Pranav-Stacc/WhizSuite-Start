import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainEventTypes } from '@agency-os/contracts';
import type { AppConfig } from '../../../shared/config/app.config';
import { OutboxService } from '../../../shared/events/outbox.service';
import { AuthService } from '../../identity/application/services/auth.service';
import { WorkRepository } from '../infrastructure/repositories/work.repository';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const MS_PER_HOUR = 3_600_000;
const DAY_KEY_LENGTH = 10;

@Injectable()
export class TaskReminderScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TaskReminderScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly repository: WorkRepository,
    private readonly outbox: OutboxService,
    private readonly identity: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('REMINDER_SCHEDULER_ENABLED', { infer: true })) return;
    const interval = this.config.get('REMINDER_SCHEDULER_POLL_MS', {
      infer: true,
    });
    this.timer = setInterval(() => void this.poll(), interval);
    this.logger.log(`Task reminder scheduler polling every ${interval}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.emitDueSoon();
      await this.emitOverdue();
    } catch (error) {
      this.logger.error({ err: error }, 'Task reminder poll failed');
    } finally {
      this.running = false;
    }
  }

  private async emitDueSoon(): Promise<void> {
    const hours = this.config.get('TASK_REMINDER_DUE_SOON_HOURS', {
      infer: true,
    });
    const limit = this.config.get('REMINDER_SCHEDULER_BATCH', { infer: true });
    const now = new Date();
    const windowEnd = new Date(now.getTime() + hours * MS_PER_HOUR);
    const tasks = await this.repository.listOpenTasksDueBetween(
      now,
      windowEnd,
      limit,
    );
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const recipientIds = await this.recipientIds(
        task.organizationId,
        task.assignees.map((a) => a.membershipId),
        task.createdById,
      );
      if (recipientIds.length === 0) continue;
      const day = task.dueDate.toISOString().slice(0, DAY_KEY_LENGTH);
      await this.outbox.write({
        type: DomainEventTypes.TASK_DUE_SOON,
        version: 1,
        organizationId: task.organizationId,
        payload: {
          taskId: task.id,
          title: task.title,
          recipientIds,
          reminderKey: `task.due_soon:${task.id}:${day}`,
        },
        actor: { id: SYSTEM_ACTOR_ID, type: 'system' },
      });
    }
  }

  private async emitOverdue(): Promise<void> {
    const limit = this.config.get('REMINDER_SCHEDULER_BATCH', { infer: true });
    const now = new Date();
    const tasks = await this.repository.listOpenTasksOverdueBefore(now, limit);
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const recipientIds = await this.recipientIds(
        task.organizationId,
        task.assignees.map((a) => a.membershipId),
        task.createdById,
      );
      if (recipientIds.length === 0) continue;
      const day = now.toISOString().slice(0, DAY_KEY_LENGTH);
      await this.outbox.write({
        type: DomainEventTypes.TASK_OVERDUE,
        version: 1,
        organizationId: task.organizationId,
        payload: {
          taskId: task.id,
          title: task.title,
          recipientIds,
          reminderKey: `task.overdue:${task.id}:${day}`,
        },
        actor: { id: SYSTEM_ACTOR_ID, type: 'system' },
      });
    }
  }

  private async recipientIds(
    organizationId: string,
    membershipIds: string[],
    createdById: string | null,
  ): Promise<string[]> {
    const users = await this.identity.userIdsByMembership(
      organizationId,
      membershipIds,
    );
    const ids = [...users.values()];
    if (createdById) ids.push(createdById);
    return [...new Set(ids)];
  }
}
