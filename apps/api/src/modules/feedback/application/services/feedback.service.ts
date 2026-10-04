import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { FeedbackRepository } from '../../infrastructure/repositories/feedback.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly repository: FeedbackRepository,
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
      action: 'feedback/threads.create',
      entityType: 'feedbackThread',
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
      action: 'feedback/threads.update',
      entityType: 'feedbackThread',
      entityId: id,
      after: data,
    });
    return this.get(organizationId, id);
  }
}
