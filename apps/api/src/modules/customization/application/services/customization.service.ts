import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { CustomizationRepository } from '../../infrastructure/repositories/customization.repository';
import type {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from '../../interface/http/dto/custom-field.dto';

const ENTITY_TYPE = 'customFieldDefinition';

@Injectable()
export class CustomizationService {
  constructor(
    private readonly repository: CustomizationRepository,
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
    input: CreateCustomFieldDto,
  ) {
    const item = await this.repository.create(organizationId, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'custom-fields.create',
      entityType: ENTITY_TYPE,
      entityId: item.id,
      after: { ...input },
    });
    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateCustomFieldDto,
  ) {
    const before = await this.get(organizationId, id);
    await this.repository.update(organizationId, id, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'custom-fields.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { label: before.label, isRequired: before.isRequired },
      after: { ...input },
    });
    return this.get(organizationId, id);
  }
}
