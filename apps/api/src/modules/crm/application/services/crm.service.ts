import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { CrmRepository } from '../../infrastructure/repositories/crm.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

@Injectable()
export class CrmService {
  constructor(
    private readonly repository: CrmRepository,
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
    const resolved = await this.resolveLeadData(organizationId, data);
    const item = await this.repository.create(organizationId, resolved);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'leads.create',
      entityType: 'lead',
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
      action: 'leads.update',
      entityType: 'lead',
      entityId: id,
      after: data,
    });
    return this.get(organizationId, id);
  }

  private async resolveLeadData(
    organizationId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (data.pipelineId && data.stageId) return data;
    const pipeline = await this.repository.findDefaultPipeline(organizationId);
    const firstStage = pipeline?.stages[0];
    if (!pipeline || !firstStage) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          code: ErrorCodes.VALIDATION_FAILED,
          detail: 'No default CRM pipeline configured for organization',
        },
        400,
      );
    }
    return {
      ...data,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
    };
  }
}
