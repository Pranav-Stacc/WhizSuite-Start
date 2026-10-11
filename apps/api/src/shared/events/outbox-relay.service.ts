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
import { TenantContext } from '../tenant/tenant.context';

const STATUS_PENDING = 'PENDING';
const STATUS_PROCESSING = 'PROCESSING';
const STATUS_PUBLISHED = 'PUBLISHED';
const STATUS_DEAD = 'DEAD';

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

  private backoffMs(attempts: number): number {
    const base = this.config.get('OUTBOX_BACKOFF_BASE_MS', { infer: true });
    const max = this.config.get('OUTBOX_BACKOFF_MAX_MS', { infer: true });
    const delay = base * 2 ** Math.min(attempts, 12);
    return Math.min(delay, max);
  }

  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await TenantContext.runSystem(async () => {
        const batchSize = this.config.get('OUTBOX_BATCH_SIZE', { infer: true });
        const maxAttempts = this.config.get('OUTBOX_MAX_ATTEMPTS', { infer: true });
        const now = new Date();

        const claimed = await this.prisma.$queryRaw<
          Array<{
            id: string;
            organization_id: string;
            type: string;
            version: number;
            payload: unknown;
            correlation_id: string;
            causation_id: string | null;
            actor_id: string;
            actor_type: string;
            attempts: number;
            created_at: Date;
          }>
        >`
          UPDATE shared.outbox_events
          SET status = ${STATUS_PROCESSING}
          WHERE id IN (
            SELECT id FROM shared.outbox_events
            WHERE status = ${STATUS_PENDING}
              AND next_attempt_at <= ${now}
              AND attempts < ${maxAttempts}
            ORDER BY created_at ASC
            LIMIT ${batchSize}
            FOR UPDATE SKIP LOCKED
          )
          RETURNING id, organization_id, type, version, payload, correlation_id, causation_id, actor_id, actor_type, attempts, created_at
        `;

        for (const event of claimed) {
          try {
            await this.eventBus.publish({
              id: event.id,
              type: event.type,
              version: event.version,
              organizationId: event.organization_id,
              occurredAt: event.created_at.toISOString(),
              actor: { id: event.actor_id, type: event.actor_type as 'user' },
              correlationId: event.correlation_id,
              causationId: event.causation_id ?? undefined,
              payload: event.payload as Record<string, unknown>,
            });
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: { status: STATUS_PUBLISHED, publishedAt: new Date() },
            });
          } catch (err) {
            const attempts = event.attempts + 1;
            const dead = attempts >= maxAttempts;
            this.logger.error(
              `Failed to relay outbox event ${event.id} (attempt ${attempts})`,
              err,
            );
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                status: dead ? STATUS_DEAD : STATUS_PENDING,
                attempts,
                nextAttemptAt: dead
                  ? undefined
                  : new Date(Date.now() + this.backoffMs(attempts)),
              },
            });
          }
        }
      });
    } finally {
      this.running = false;
    }
  }
}
