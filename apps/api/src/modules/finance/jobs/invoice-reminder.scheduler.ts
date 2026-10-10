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
import { MembersService } from '../../identity/application/services/members.service';
import { FinanceRepository } from '../infrastructure/repositories/finance.repository';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const DAY_KEY_LENGTH = 10;
const STAFF_TYPES = new Set(['OWNER', 'ADMIN', 'MEMBER']);

@Injectable()
export class InvoiceReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceReminderScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly repository: FinanceRepository,
    private readonly members: MembersService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('REMINDER_SCHEDULER_ENABLED', { infer: true })) return;
    const interval = this.config.get('REMINDER_SCHEDULER_POLL_MS', {
      infer: true,
    });
    this.timer = setInterval(() => void this.poll(), interval);
    this.logger.log(`Invoice reminder scheduler polling every ${interval}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const limit = this.config.get('REMINDER_SCHEDULER_BATCH', {
        infer: true,
      });
      const now = new Date();
      const invoices = await this.repository.listOverdueInvoices(now, limit);
      const day = now.toISOString().slice(0, DAY_KEY_LENGTH);
      const staffByOrg = new Map<string, string[]>();

      for (const invoice of invoices) {
        let recipientIds = staffByOrg.get(invoice.organizationId);
        if (!recipientIds) {
          const members = await this.members.list(invoice.organizationId);
          recipientIds = members
            .filter((m) => STAFF_TYPES.has(m.membershipType))
            .map((m) => m.id);
          staffByOrg.set(invoice.organizationId, recipientIds);
        }
        if (recipientIds.length === 0) continue;
        await this.outbox.write({
          type: DomainEventTypes.INVOICE_OVERDUE,
          version: 1,
          organizationId: invoice.organizationId,
          payload: {
            invoiceId: invoice.id,
            title: invoice.number,
            recipientIds,
            reminderKey: `invoice.overdue:${invoice.id}:${day}`,
          },
          actor: { id: SYSTEM_ACTOR_ID, type: 'system' },
        });
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Invoice reminder poll failed');
    } finally {
      this.running = false;
    }
  }
}
