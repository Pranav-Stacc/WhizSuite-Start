import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { TemplatesRepository } from '../../infrastructure/repositories/templates.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly repository: TemplatesRepository,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.repository.list(organizationId);
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (!item) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return item;
  }

  async create(organizationId: string, actorId: string, data: Record<string, unknown>) {
    const item = await this.repository.create(organizationId, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'templates.create',
      entityType: 'template',
      entityId: (item as { id: string }).id,
      after: item as Record<string, unknown>,
    });
    return item;
  }

  async update(organizationId: string, actorId: string, id: string, data: Record<string, unknown>) {
    await this.get(organizationId, id);
    await this.repository.update(organizationId, id, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'templates.update',
      entityType: 'template',
      entityId: id,
      after: data,
    });
    return this.get(organizationId, id);
  }
}
