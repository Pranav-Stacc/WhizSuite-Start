import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Actor, EventEnvelope } from '@agency-os/contracts';
import { PrismaService } from '../database/prisma.service';
import { TenantContext } from '../tenant/tenant.context';

export interface OutboxWriteInput {
  type: string;
  version: number;
  organizationId: string;
  payload: Record<string, unknown>;
  actor: Actor;
  causationId?: string;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async write(
    input: OutboxWriteInput,
    tx?: Parameters<PrismaService['$transaction']>[0] extends (
      client: infer C,
    ) => Promise<unknown>
      ? C
      : never,
  ): Promise<EventEnvelope> {
    const envelope: EventEnvelope = {
      id: randomUUID(),
      type: input.type,
      version: input.version,
      organizationId: input.organizationId,
      occurredAt: new Date().toISOString(),
      actor: input.actor,
      correlationId: TenantContext.getCorrelationId(),
      causationId: input.causationId,
      payload: input.payload,
    };

    const client = (tx ?? this.prisma) as PrismaService;
    await client.outboxEvent.create({
      data: {
        id: envelope.id,
        organizationId: envelope.organizationId,
        type: envelope.type,
        version: envelope.version,
        payload: envelope.payload as Prisma.InputJsonObject,
        correlationId: envelope.correlationId,
        causationId: envelope.causationId,
        actorId: envelope.actor.id,
        actorType: envelope.actor.type,
        status: 'PENDING',
      },
    });

    return envelope;
  }
}
