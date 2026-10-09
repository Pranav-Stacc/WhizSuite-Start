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
import {
  approverIdsOf,
  evaluateApprovalAction,
  parseApproverSpec,
} from '../domain/approval-evaluation';
import { ApproverResolutionService } from './approver-resolution.service';

const ENTITY_TYPE = 'approvalRequest';
const DEFAULT_STEP_RULE = 'ANY';
const APPROVED = 'APPROVED';
const PENDING = 'PENDING';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repository: ApprovalsRepository,
    private readonly resolver: ApproverResolutionService,
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

  /** Pending approvals for the calendar feed (dueAt, else createdAt). */
  listPendingInRange(
    organizationId: string,
    range: { from: Date; to: Date },
  ) {
    return this.repository.listPendingInRange(
      organizationId,
      range,
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
    const steps = await Promise.all(
      input.steps.map(async (step) => {
        const resolved = await this.resolver.resolve(organizationId, {
          approverIds: step.approverIds ?? [],
          roleIds: step.roleIds ?? [],
          scopeType: step.scopeType,
          scopeResourceId: step.scopeResourceId,
          quorumCount: step.quorumCount,
        });
        return {
          name: step.name,
          rule: step.rule ?? DEFAULT_STEP_RULE,
          approverSpec: { ...resolved } as Record<string, unknown>,
        };
      }),
    );
    const request = await this.repository.create(organizationId, {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      subjectVersion: input.subjectVersion,
      requestedById: actorId,
      steps,
    });
    await this.notifyPendingStep(organizationId, actorId, request);
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
    } else if (
      transition.stepStatus === APPROVED &&
      !transition.requestStatus
    ) {
      const after = await this.get(organizationId, requestId);
      await this.notifyPendingStep(organizationId, actorId, after);
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

  private async notifyPendingStep(
    organizationId: string,
    actorId: string,
    request: {
      id: string;
      subjectType: string;
      steps: Array<{
        id: string;
        order: number;
        name: string;
        rule: string;
        status: string;
        approverSpec: unknown;
      }>;
    },
  ) {
    const step = [...request.steps]
      .sort((a, b) => a.order - b.order)
      .find((s) => s.status === PENDING);
    if (!step) return;
    const recipientIds = approverIdsOf(step).filter((id) => id !== actorId);
    if (recipientIds.length === 0) return;
    const title = `${step.name}: ${request.subjectType}`;
    await this.outbox.write({
      type: DomainEventTypes.APPROVAL_REQUESTED,
      version: 1,
      organizationId,
      payload: {
        approvalRequestId: request.id,
        stepId: step.id,
        stepName: step.name,
        recipientIds,
        title,
        quorumCount: parseApproverSpec(step.approverSpec).quorumCount,
        rule: step.rule,
      },
      actor: { id: actorId, type: 'user' },
    });
  }
}
