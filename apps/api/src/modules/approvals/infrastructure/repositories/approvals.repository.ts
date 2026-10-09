import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

export interface ApprovalStepRow {
  name: string;
  rule: string;
  approverIds: string[];
}

export interface ApprovalCreateRow {
  subjectType: string;
  subjectId: string;
  subjectVersion: string;
  requestedById: string;
  steps: ApprovalStepRow[];
}

export interface ApprovalActionRow {
  requestId: string;
  stepId: string;
  actorId: string;
  action: string;
  comment?: string;
}

/** Outcome of one action: the step's new status, and the request's when it changes. */
export interface ApprovalTransition {
  stepId: string;
  stepStatus: string;
  requestStatus?: string;
}

const WITH_STEPS = {
  steps: { orderBy: { order: 'asc' as const } },
  actions: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number) {
    return this.prisma.approvalRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: WITH_STEPS,
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.approvalRequest.findFirst({
      where: { id, organizationId },
      include: WITH_STEPS,
    });
  }

  create(organizationId: string, data: ApprovalCreateRow) {
    return this.prisma.approvalRequest.create({
      data: {
        organizationId,
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        subjectVersion: data.subjectVersion,
        requestedById: data.requestedById,
        status: 'PENDING',
        steps: {
          create: data.steps.map((step, index) => ({
            organizationId,
            order: index + 1,
            name: step.name,
            rule: step.rule,
            approverSpec: { approverIds: step.approverIds },
            status: 'PENDING',
          })),
        },
      },
      include: WITH_STEPS,
    });
  }

  /** Records the action and applies the resulting step/request statuses atomically. */
  async act(
    organizationId: string,
    row: ApprovalActionRow,
    transition: ApprovalTransition,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.approvalAction.create({
        data: { organizationId, actorType: 'user', ...row },
      }),
      this.prisma.approvalStep.updateMany({
        where: { id: transition.stepId, organizationId },
        data: { status: transition.stepStatus },
      }),
      ...(transition.requestStatus
        ? [
            this.prisma.approvalRequest.updateMany({
              where: { id: row.requestId, organizationId },
              data: { status: transition.requestStatus },
            }),
          ]
        : []),
    ]);
  }
}
