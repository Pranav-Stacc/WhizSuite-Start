import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { DomainEventTypes } from '@agency-os/contracts';
import { AuditRepository } from '../../infrastructure/repositories/audit.repository';

export interface AuditRecordInput {
  organizationId: string;
  actorId?: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  outcome?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly repository: AuditRepository,
  ) {}

  list(
    organizationId: string,
    options: { cursor?: string; limit?: number } = {},
  ) {
    return this.repository.list(organizationId, {
      cursor: options.cursor,
      limit: options.limit ?? 20,
    });
  }

  async record(input: AuditRecordInput): Promise<void> {
    const ctx = TenantContext.get();
    await this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: toInputJson(input.before),
        after: toInputJson(input.after),
        outcome: input.outcome ?? 'SUCCESS',
        reason: input.reason,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
        correlationId: TenantContext.getCorrelationId(),
        metadata: toInputJson(input.metadata),
      },
    });

    if (input.actorId) {
      await this.outbox.write({
        type: DomainEventTypes.AUDIT_RECORDED,
        version: 1,
        organizationId: input.organizationId,
        payload: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
        },
        actor: { id: input.actorId, type: 'user' },
      });
    }
  }
}
