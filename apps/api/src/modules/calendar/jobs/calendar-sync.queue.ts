import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

export const CALENDAR_SYNC_QUEUE = 'calendar-sync';

export type CalendarSyncOutboundJob = {
  kind: 'OUTBOUND';
  organizationId: string;
  calendarItemId: string;
  actorId?: string;
};

export type CalendarSyncInboundJob = {
  kind: 'INBOUND';
  organizationId: string;
  actorId?: string;
  from: string;
  to: string;
};

export type CalendarSyncJobPayload =
  | CalendarSyncOutboundJob
  | CalendarSyncInboundJob;

@Injectable()
export class CalendarSyncQueue {
  constructor(
    @InjectQueue(CALENDAR_SYNC_QUEUE) private readonly queue: Queue,
  ) {}

  enqueueOutbound(payload: Omit<CalendarSyncOutboundJob, 'kind'>) {
    return this.queue.add(
      'outbound',
      { kind: 'OUTBOUND', ...payload } satisfies CalendarSyncOutboundJob,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  enqueueInbound(payload: Omit<CalendarSyncInboundJob, 'kind'>) {
    return this.queue.add(
      'inbound',
      { kind: 'INBOUND', ...payload } satisfies CalendarSyncInboundJob,
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 25,
      },
    );
  }
}
