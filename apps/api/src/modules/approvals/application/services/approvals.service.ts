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
  type EvaluatedRequest,
} from '../domain/approval-evaluation';
import { SubjectScopeService } from '../../../../shared/tenant/subject-scope.service';
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
    private readonly subjectScope: SubjectScopeService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.repository.list(
      organizationId,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
    );
    return this.subjectScope.filterSubjects(organizationId, rows);
  }

  /** Pending approvals for the calendar feed (dueAt, else createdAt). */
  async listPendingInRange(
    organizationId: string,
    range: { from: Date; to: Date },
  ) {
    const rows = await this.repository.listPendingInRange(
      organizationId,
      range,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
    );
    return this.subjectScope.filterSubjects(organizationId, rows);
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (
      !item ||
      !(await this.subjectScope.canAccessSubject(
        organizationId,
        item.subjectType,
        item.subjectId,
      ))
    ) {
      throw notFound('Approval not found');
    }
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
          basis: step.basis,
          targetIds: step.targetIds,
          assigneeUserIds: step.assigneeUserIds,
          scopeType: step.scopeType,
          scopeResourceId: step.scopeResourceId,
          quorumCount: step.quorumCount,
        });
        return {
          name: step.name,
          rule: step.rule ?? DEFAULT_STEP_RULE,
          approverSpec: { ...resolved },
        };
      }),
    );
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    const request = await this.repository.create(organizationId, {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      subjectVersion: input.subjectVersion,
      requestedById: actorId,
      dueAt,
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
    if (transition.requestStatus) {
      await this.outbox.write({
        type: DomainEventTypes.APPROVAL_COMPLETED,
        version: 1,
        organizationId,
        payload: {
          approvalRequestId: requestId,
          status: transition.requestStatus,
          requestedById: before.requestedById,
          title: `${before.subjectType}`,
          recipientIds: [before.requestedById],
        },
        actor: { id: actorId, type: 'user' },
      });
    } else if (transition.stepStatus === APPROVED) {
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

  findPendingForSubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ) {
    return this.repository.findPendingBySubject(
      organizationId,
      subjectType,
      subjectId,
    );
  }

  async cancelPendingForSubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<void> {
    const row = await this.repository.findPendingBySubject(
      organizationId,
      subjectType,
      subjectId,
    );
    if (row) await this.repository.cancelRequest(organizationId, row.id);
  }

  canActorApproveStep(request: EvaluatedRequest, actorId: string): boolean {
    const steps = [...request.steps].sort((a, b) => a.order - b.order);
    const step = steps.find((row) => row.status === PENDING);
    if (!step) return false;
    const pool = approverIdsOf(step);
    return pool.length === 0 || pool.includes(actorId);
  }

  summarizePending(request: {
    id: string;
    status: string;
    dueAt: Date | null;
    steps: Array<{
      id: string;
      order: number;
      name: string;
      status: string;
      rule: string;
      approverSpec: unknown;
    }>;
  }) {
    const steps = [...request.steps].sort((a, b) => a.order - b.order);
    const current = steps.find((row) => row.status === PENDING);
    if (!current) return null;
    const spec = parseApproverSpec(current.approverSpec);
    return {
      requestId: request.id,
      status: request.status,
      dueAt: request.dueAt,
      currentStep: {
        order: current.order,
        name: current.name,
        rule: current.rule,
        basis: spec.basis,
        approverUserIds: approverIdsOf(current),
        quorumCount: spec.quorumCount,
      },
      totalSteps: steps.length,
      steps: steps.map((row) => {
        const spec = parseApproverSpec(row.approverSpec);
        return {
          order: row.order,
          name: row.name,
          status: row.status,
          rule: row.rule,
          approverUserIds: approverIdsOf(row),
          quorumCount: spec.quorumCount,
        };
      }),
    };
  }

  async sendReminder(
    organizationId: string,
    actorId: string,
    requestId: string,
  ): Promise<void> {
    const request = await this.get(organizationId, requestId);
    if (request.status !== PENDING) {
      throw notFound('No pending approval to remind');
    }
    const step = [...request.steps]
      .sort((a, b) => a.order - b.order)
      .find((s) => s.status === PENDING);
    if (!step) throw notFound('No pending approval step');
    const recipientIds = approverIdsOf(step).filter((id) => id !== actorId);
    if (recipientIds.length === 0) {
      throw notFound('No approvers to notify');
    }
    const title = `${step.name}: ${request.subjectType}`;
    const reminderKey = `approval.reminder.manual:${request.id}:${Date.now()}`;
    await this.outbox.write({
      type: DomainEventTypes.APPROVAL_REMINDER,
      version: 1,
      organizationId,
      payload: {
        approvalRequestId: request.id,
        stepId: step.id,
        title,
        recipientIds,
        reminderKey,
      },
      actor: { id: actorId, type: 'user' },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'approvals.remind',
      entityType: ENTITY_TYPE,
      entityId: requestId,
      metadata: { stepId: step.id, recipientCount: recipientIds.length },
    });
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
