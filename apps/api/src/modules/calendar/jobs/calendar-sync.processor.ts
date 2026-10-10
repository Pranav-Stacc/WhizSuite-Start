import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { GoogleCalendarSyncService } from '../application/services/google-calendar-sync.service';
import {
  CALENDAR_SYNC_QUEUE,
  type CalendarSyncJobPayload,
} from './calendar-sync.queue';

@Processor(CALENDAR_SYNC_QUEUE)
export class CalendarSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarSyncProcessor.name);

  constructor(private readonly sync: GoogleCalendarSyncService) {
    super();
  }

  async process(job: Job<CalendarSyncJobPayload>): Promise<{ ok: boolean }> {
    try {
      if (job.data.kind === 'OUTBOUND') {
        await this.sync.syncItemOutbound(
          job.data.organizationId,
          job.data.calendarItemId,
        );
      } else {
        await this.sync.syncInboundRange(job.data.organizationId, {
          from: job.data.from,
          to: job.data.to,
        });
      }
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      this.logger.error(`Calendar sync job ${job.id} failed: ${message}`);
      throw error;
    }
  }
}
