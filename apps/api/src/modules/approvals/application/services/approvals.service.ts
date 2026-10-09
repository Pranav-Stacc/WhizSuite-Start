import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainEventTypes } from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import { ApprovalsRepository } from '../../infrastructure/repositories/approvals.repository';
import type {
  ActApprovalDto,
  CreateApprovalDto,
} from '../../interface/http/dto/approval.dto';
import { evaluateApprovalAction } from '../domain/approval-evaluation';

const ENTITY_TYPE = 'approvalRequest';
const DEFAULT_STEP_RULE = 'ANY';
const APPROVED = 'APPROVED';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repository: ApprovalsRepository,
    private readonly outbox: OutboxService,
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
    if (!item) throw notFound('Approval not found');
    return item;
  }

  async request(
    organizationId: string,
    actorId: string,
    input: CreateApprovalDto,
  ) {
    const request = await this.repository.create(organizationId, {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      subjectVersion: input.subjectVersion,
      requestedById: actorId,
      steps: input.steps.map((step) => ({
        name: step.name,
        rule: step.rule ?? DEFAULT_STEP_RULE,
        approverIds: step.approverIds ?? [],
      })),
    });
    await this.outbox.write({
      type: DomainEventTypes.APPROVAL_REQUESTED,
      version: 1,
      organizationId,
      payload: { approvalRequestId: request.id },
      actor: { id: actorId, type: 'user' },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'approvals.request',
      entityType: ENTITY_TYPE,
      entityId: request.id,
      after: {
        subjectType: request.subjectType,
        subjectId: request.subjectId,
        steps: request.steps.length,
      },
    });
    return request;
  }

  async act(
    organizationId: string,
    actorId: string,
    requestId: string,
    input: ActApprovalDto,
  ) {
    const before = await this.get(organizationId, requestId);
    const transition = evaluateApprovalAction(before, actorId, input.action);
    await this.repository.act(
      organizationId,
      {
        requestId,
        stepId: transition.stepId,
        actorId,
        action: input.action,
        comment: input.comment,
      },
      transition,
    );
    if (transition.requestStatus === APPROVED) {
      await this.outbox.write({
        type: DomainEventTypes.APPROVAL_COMPLETED,
        version: 1,
        organizationId,
        payload: { approvalRequestId: requestId },
        actor: { id: actorId, type: 'user' },
      });
    }
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'approvals.act',
      entityType: ENTITY_TYPE,
      entityId: requestId,
      before: { status: before.status },
      after: {
        status: transition.requestStatus ?? before.status,
        stepStatus: transition.stepStatus,
      },
      metadata: { action: input.action, stepId: transition.stepId },
    });
    return this.get(organizationId, requestId);
  }
}
