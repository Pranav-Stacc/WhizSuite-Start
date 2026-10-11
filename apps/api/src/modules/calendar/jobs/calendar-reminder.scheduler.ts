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
import { CalendarRepository } from '../infrastructure/repositories/calendar.repository';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const MS_PER_MINUTE = 60_000;

function reminderUserIds(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const raw = (metadata as { reminderUserIds?: unknown }).reminderUserIds;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw.filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
}

@Injectable()
export class CalendarReminderScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CalendarReminderScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly repository: CalendarRepository,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('REMINDER_SCHEDULER_ENABLED', { infer: true })) return;
    const interval = this.config.get('REMINDER_SCHEDULER_POLL_MS', {
      infer: true,
    });
    this.timer = setInterval(() => void this.poll(), interval);
    this.logger.log(`Calendar reminder scheduler polling every ${interval}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.emitDueReminders();
    } catch (error) {
      this.logger.error({ err: error }, 'Calendar reminder poll failed');
    } finally {
      this.running = false;
    }
  }

  private async emitDueReminders(): Promise<void> {
    const leadMinutes = this.config.get('CALENDAR_REMINDER_LEAD_MINUTES', {
      infer: true,
    });
    const limit = this.config.get('REMINDER_SCHEDULER_BATCH', { infer: true });
    const pollMs = this.config.get('REMINDER_SCHEDULER_POLL_MS', {
      infer: true,
    });
    const now = new Date();
    const graceMs = pollMs + MS_PER_MINUTE;
    const windowStart = new Date(now.getTime() - graceMs);
    const windowEnd = new Date(
      now.getTime() + leadMinutes * MS_PER_MINUTE + graceMs,
    );

    const items = await this.repository.listStartingBetween(
      windowStart,
      windowEnd,
      limit,
    );

    for (const item of items) {
      const recipientIds = reminderUserIds(item.metadata);
      if (recipientIds.length === 0) continue;

      const fireKey = item.startsAt.toISOString();
      await this.outbox.write({
        type: DomainEventTypes.CALENDAR_REMINDER_DUE,
        version: 1,
        organizationId: item.organizationId,
        payload: {
          calendarItemId: item.id,
          title: item.title,
          startsAt: fireKey,
          recipientIds,
          reminderKey: `calendar.reminder:${item.id}:${fireKey}`,
        },
        actor: { id: SYSTEM_ACTOR_ID, type: 'system' },
      });
    }
  }
}
