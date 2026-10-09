import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntegrationConnectionStatus } from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  unprocessable,
} from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { IntegrationsRepository } from '../../infrastructure/repositories/integrations.repository';
import type {
  CreateConnectionDto,
  UpdateConnectionDto,
} from '../../interface/http/dto/connection.dto';

const ENTITY_TYPE = 'integrationConnection';
const INITIAL_STATUS: IntegrationConnectionStatus = 'PENDING';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  list(organizationId: string) {
    return this.repository.list(
      organizationId,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
    );
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (!item) throw notFound();
    return item;
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateConnectionDto,
  ) {
    if (!(await this.repository.providerExists(input.providerId))) {
      throw unprocessable('Unknown integration provider');
    }
    const item = await this.repository.create(organizationId, {
      ...input,
      status: INITIAL_STATUS,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'integrations/connections.create',
      entityType: ENTITY_TYPE,
      entityId: item.id,
      after: {
        providerId: item.providerId,
        clientId: item.clientId,
        status: item.status,
      },
    });
    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateConnectionDto,
  ) {
    const before = await this.get(organizationId, id);
    await this.repository.update(organizationId, id, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'integrations/connections.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { status: before.status },
      after: { ...input },
    });
    return this.get(organizationId, id);
  }
}
