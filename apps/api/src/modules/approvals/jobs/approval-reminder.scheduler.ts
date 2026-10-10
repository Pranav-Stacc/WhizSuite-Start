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
import { approverIdsOf } from '../application/domain/approval-evaluation';
import { ApprovalsRepository } from '../infrastructure/repositories/approvals.repository';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const MS_PER_HOUR = 3_600_000;
const DAY_KEY_LENGTH = 10;
const PENDING = 'PENDING';

@Injectable()
export class ApprovalReminderScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ApprovalReminderScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly repository: ApprovalsRepository,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('REMINDER_SCHEDULER_ENABLED', { infer: true })) return;
    const interval = this.config.get('REMINDER_SCHEDULER_POLL_MS', {
      infer: true,
    });
    this.timer = setInterval(() => void this.poll(), interval);
    this.logger.log(`Approval reminder scheduler polling every ${interval}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const hours = this.config.get('APPROVAL_REMINDER_AFTER_HOURS', {
        infer: true,
      });
      const limit = this.config.get('REMINDER_SCHEDULER_BATCH', {
        infer: true,
      });
      const staleBefore = new Date(Date.now() - hours * MS_PER_HOUR);
      const requests = await this.repository.listPendingNeedingReminder(
        staleBefore,
        limit,
      );
      const day = new Date().toISOString().slice(0, DAY_KEY_LENGTH);

      for (const request of requests) {
        const step = [...request.steps]
          .sort((a, b) => a.order - b.order)
          .find((s) => s.status === PENDING);
        if (!step) continue;
        const recipientIds = approverIdsOf(step);
        if (recipientIds.length === 0) continue;
        const title = `${step.name}: ${request.subjectType}`;
        await this.outbox.write({
          type: DomainEventTypes.APPROVAL_REMINDER,
          version: 1,
          organizationId: request.organizationId,
          payload: {
            approvalRequestId: request.id,
            stepId: step.id,
            title,
            recipientIds,
            reminderKey: `approval.reminder:${request.id}:${day}`,
          },
          actor: { id: SYSTEM_ACTOR_ID, type: 'system' },
        });
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Approval reminder poll failed');
    } finally {
      this.running = false;
    }
  }
}
