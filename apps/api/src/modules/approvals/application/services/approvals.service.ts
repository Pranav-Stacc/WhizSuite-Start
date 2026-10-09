import { Injectable } from '@nestjs/common';
import { DomainEventTypes, ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { ApprovalsRepository } from '../../infrastructure/repositories/approvals.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repository: ApprovalsRepository,
    private readonly outbox: OutboxService,
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

  async request(
    organizationId: string,
    actorId: string,
    input: {
      subjectType: string;
      subjectId: string;
      subjectVersion: string;
      steps: Array<{ name: string; order: number; rule: string; approverSpec: Record<string, unknown> }>;
    },
  ) {
    const request = await this.repository.createRequest(organizationId, {
      ...input,
      requestedById: actorId,
    });
    await this.outbox.write({
      type: DomainEventTypes.APPROVAL_REQUESTED,
      version: 1,
      organizationId,
      payload: { approvalRequestId: request.id },
      actor: { id: actorId, type: 'user' },
    });
    return request;
  }

  async act(
    organizationId: string,
    actorId: string,
    requestId: string,
    action: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    comment?: string,
  ) {
    const request = await this.get(organizationId, requestId);
    await this.repository.recordAction({
      organizationId,
      requestId,
      actorId,
      actorType: 'user',
      action,
      comment,
    });

    const allApproved = action === 'APPROVED';
    const newStatus =
      action === 'APPROVED'
        ? 'APPROVED'
        : action === 'REJECTED'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED';

    await this.repository.updateRequestStatus(organizationId, requestId, newStatus);

    if (allApproved) {
      await this.outbox.write({
        type: DomainEventTypes.APPROVAL_COMPLETED,
        version: 1,
        organizationId,
        payload: { approvalRequestId: requestId },
        actor: { id: actorId, type: 'user' },
      });
    }

    return this.get(organizationId, requestId);
  }
}
