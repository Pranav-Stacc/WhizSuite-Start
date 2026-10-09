import { Injectable } from '@nestjs/common';
import { DomainEventTypes } from '@agency-os/contracts';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { ClientsRepository } from '../../infrastructure/repositories/clients.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly repo: ClientsRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, workspaceId?: string) {
    return this.repo.list(
      organizationId,
      workspaceId,
      TenantContext.clientScope(),
    );
  }

  async get(organizationId: string, clientId: string) {
    if (!TenantContext.canAccessClient(clientId)) throw notFound();
    const client = await this.repo.findById(organizationId, clientId);
    if (!client) throw notFound();
    return client;
  }

  async create(
    organizationId: string,
    actorId: string,
    input: {
      workspaceId: string;
      displayName: string;
      legalName?: string;
      industry?: string;
      website?: string;
    },
  ) {
    const client = await this.repo.create(organizationId, input);
    await this.outbox.write({
      type: DomainEventTypes.CLIENT_CREATED,
      version: 1,
      organizationId,
      payload: { clientId: client.id, displayName: client.displayName },
      actor: { id: actorId, type: 'user' },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'client.create',
      entityType: 'client',
      entityId: client.id,
      after: client,
    });
    return client;
  }

  async update(
    organizationId: string,
    clientId: string,
    actorId: string,
    data: {
      displayName?: string;
      industry?: string;
      website?: string;
      status?: string;
    },
  ) {
    await this.get(organizationId, clientId);
    const client = await this.repo.update(organizationId, clientId, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'client.update',
      entityType: 'client',
      entityId: clientId,
      after: client,
    });
    return client;
  }

  async updateBrandKit(
    organizationId: string,
    clientId: string,
    actorId: string,
    data: {
      voiceTone?: Record<string, unknown>;
      colors?: Record<string, unknown>;
      fonts?: Record<string, unknown>;
      hashtagSets?: Record<string, unknown>;
      contentPillars?: Record<string, unknown>;
    },
  ) {
    const kit = await this.repo.upsertBrandKit(organizationId, clientId, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'brand_kit.update',
      entityType: 'brand_kit',
      entityId: kit.id,
      after: kit,
    });
    return kit;
  }
}
