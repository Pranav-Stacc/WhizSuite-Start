import { Injectable } from '@nestjs/common';
import type { ApprovalAction, ContentReviewOutcome } from '@agency-os/contracts';
import type { ApprovalStepDto } from '../../../approvals/interface/http/dto/approval.dto';
import { ApprovalsService } from '../../../approvals/application/services/approvals.service';
import { WorkflowEngineService } from '../../../workflow-engine/application/services/workflow-engine.service';
import type { WorkflowStageView } from '../../../workflow-engine/application/services/workflow-engine.service';

const SUBJECT_TYPE = 'CONTENT';
const MS_PER_HOUR = 3_600_000;

type ContentRow = {
  id: string;
  clientId: string;
  createdById: string | null;
  version: number;
};

@Injectable()
export class ContentApprovalOrchestratorService {
  constructor(
    private readonly workflows: WorkflowEngineService,
    private readonly approvals: ApprovalsService,
  ) {}

  async startForContent(
    organizationId: string,
    actorId: string,
    content: ContentRow,
  ): Promise<string | null> {
    await this.approvals.cancelPendingForSubject(
      organizationId,
      SUBJECT_TYPE,
      content.id,
    );

    const definition = await this.workflows.pickDefinition(
      organizationId,
      'content',
      content.clientId,
    );
    if (!definition?.stages?.length) return null;

    const slaHours = definition.slaHours ?? 48;
    const dueAt = new Date(Date.now() + slaHours * MS_PER_HOUR).toISOString();
    const steps = definition.stages.map((stage) =>
      this.toApprovalStep(stage, content),
    );

    await this.approvals.request(organizationId, actorId, {
      subjectType: SUBJECT_TYPE,
      subjectId: content.id,
      subjectVersion: String(content.version),
      dueAt,
      steps,
    });

    return definition.versionId;
  }

  async actOnReview(
    organizationId: string,
    actorId: string,
    contentId: string,
    outcome: ContentReviewOutcome,
  ): Promise<{ requestStatus: string } | null> {
    const pending = await this.approvals.findPendingForSubject(
      organizationId,
      SUBJECT_TYPE,
      contentId,
    );
    if (!pending) return null;

    const action: ApprovalAction =
      outcome === 'APPROVED'
        ? 'APPROVED'
        : outcome === 'CHANGES_REQUESTED'
          ? 'CHANGES_REQUESTED'
          : 'REJECTED';

    const after = await this.approvals.act(organizationId, actorId, pending.id, {
      action,
    });
    return { requestStatus: after.status };
  }

  canUserApprove(
    organizationId: string,
    userId: string,
    contentId: string,
  ): Promise<boolean> {
    return this.approvals
      .findPendingForSubject(organizationId, SUBJECT_TYPE, contentId)
      .then((pending) =>
        pending ? this.approvals.canActorApproveStep(pending, userId) : true,
      );
  }

  summarize(organizationId: string, contentId: string) {
    return this.approvals
      .findPendingForSubject(organizationId, SUBJECT_TYPE, contentId)
      .then((pending) => (pending ? this.approvals.summarizePending(pending) : null));
  }

  private toApprovalStep(
    stage: WorkflowStageView,
    content: ContentRow,
  ): ApprovalStepDto {
    const basis = stage.basis;
    const scopeType = this.narrowScopeType(stage.scopeType);
    return {
      name: stage.name,
      rule: stage.approvalRule,
      quorumCount: stage.quorumCount,
      basis,
      targetIds: stage.targetIds,
      approverIds: stage.approverIds,
      roleIds: stage.roleIds,
      scopeType,
      scopeResourceId: stage.scopeResourceId ?? content.clientId,
      assigneeUserIds:
        basis === 'ASSIGNEE' && content.createdById
          ? [content.createdById]
          : undefined,
    };
  }

  private narrowScopeType(
    value?: string,
  ): ApprovalStepDto['scopeType'] {
    const allowed: NonNullable<ApprovalStepDto['scopeType']>[] = [
      'ORGANIZATION',
      'CLIENT',
      'PROJECT',
      'WORKSPACE',
      'TEAM',
      'DEPARTMENT',
    ];
    return value && allowed.includes(value as NonNullable<ApprovalStepDto['scopeType']>)
      ? (value as NonNullable<ApprovalStepDto['scopeType']>)
      : undefined;
  }
}
