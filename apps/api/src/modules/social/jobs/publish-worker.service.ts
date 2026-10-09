import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { DomainEventTypes } from '@agency-os/contracts';

@Injectable()
export class PublishWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublishWorkerService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.processDueJobs(), 30_000);
    this.logger.log('Publish worker started');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processDueJobs(): Promise<void> {
    const jobs = await this.prisma.publishJob.findMany({
      where: {
        status: 'QUEUED',
        scheduledFor: { lte: new Date() },
      },
      take: 20,
      include: { variant: true },
    });

    for (const job of jobs) {
      try {
        await this.prisma.publishJob.update({
          where: { id: job.id },
          data: { status: 'PUBLISHING', attempts: { increment: 1 } },
        });

        // Platform adapter would publish here — NOTIFY_PUBLISH fallback for MVP
        await this.prisma.contentVariant.update({
          where: { id: job.variantId },
          data: {
            publishStatus: 'PUBLISHED',
            permalink: `manual://${job.variantId}`,
          },
        });

        await this.prisma.publishJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        await this.outbox.write({
          type: DomainEventTypes.SOCIAL_POST_PUBLISHED,
          version: 1,
          organizationId: job.organizationId,
          payload: { variantId: job.variantId, jobId: job.id },
          actor: { id: '00000000-0000-0000-0000-000000000000', type: 'system' },
        });
      } catch (err) {
        this.logger.error(`Publish job ${job.id} failed`, err);
        await this.prisma.publishJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', lastError: String(err) },
        });
        await this.outbox.write({
          type: DomainEventTypes.SOCIAL_POST_FAILED,
          version: 1,
          organizationId: job.organizationId,
          payload: {
            variantId: job.variantId,
            jobId: job.id,
            error: String(err),
          },
          actor: { id: '00000000-0000-0000-0000-000000000000', type: 'system' },
        });
      }
    }
  }
}
