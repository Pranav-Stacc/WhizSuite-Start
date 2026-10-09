import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/app.config';
import { PrismaService } from '../database/prisma.service';
import { DomainEventBus } from './domain-event.bus';

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly eventBus: DomainEventBus,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('OUTBOX_RELAY_ENABLED', { infer: true })) {
      this.logger.log('Outbox relay disabled');
      return;
    }
    const interval = this.config.get('OUTBOX_POLL_INTERVAL_MS', {
      infer: true,
    });
    this.timer = setInterval(() => void this.poll(), interval);
    this.logger.log(`Outbox relay started (interval=${interval}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const batchSize = this.config.get('OUTBOX_BATCH_SIZE', { infer: true });
      const events = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      });

      for (const event of events) {
        try {
          await this.eventBus.publish({
            id: event.id,
            type: event.type,
            version: event.version,
            organizationId: event.organizationId,
            occurredAt: event.createdAt.toISOString(),
            actor: { id: event.actorId, type: event.actorType as 'user' },
            correlationId: event.correlationId,
            causationId: event.causationId ?? undefined,
            payload: event.payload as Record<string, unknown>,
          });
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
          });
        } catch (err) {
          this.logger.error(`Failed to relay outbox event ${event.id}`, err);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { attempts: { increment: 1 } },
          });
        }
      }
    } finally {
      this.running = false;
    }
  }
}
