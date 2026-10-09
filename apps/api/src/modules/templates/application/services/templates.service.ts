import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { TemplatesRepository } from '../../infrastructure/repositories/templates.repository';
import type {
  CreateTemplateDto,
  UpdateTemplateDto,
} from '../../interface/http/dto/template.dto';

const ENTITY_TYPE = 'template';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly repository: TemplatesRepository,
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
    input: CreateTemplateDto,
  ) {
    const item = await this.repository.create(organizationId, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'templates.create',
      entityType: ENTITY_TYPE,
      entityId: item.id,
      after: { type: item.type, name: item.name },
    });
    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateTemplateDto,
  ) {
    const before = await this.get(organizationId, id);
    await this.repository.update(organizationId, id, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'templates.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { name: before.name, version: before.version },
      after: {
        name: input.name,
        scope: input.scope,
        definitionChanged: !!input.definition,
      },
    });
    return this.get(organizationId, id);
  }
}
