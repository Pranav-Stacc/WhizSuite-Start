import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { steps: true, actions: true },
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.approvalRequest.findFirst({
      where: { id, organizationId },
      include: { steps: true, actions: true },
    });
  }

  createRequest(
    organizationId: string,
    data: {
      subjectType: string;
      subjectId: string;
      subjectVersion: string;
      requestedById: string;
      steps: Array<{ name: string; order: number; rule: string; approverSpec: Record<string, unknown> }>;
    },
  ) {
    return this.prisma.approvalRequest.create({
      data: {
        organizationId,
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        subjectVersion: data.subjectVersion,
        requestedById: data.requestedById,
        status: 'PENDING',
        steps: {
          create: data.steps.map((s) => ({
            organizationId,
            order: s.order,
            name: s.name,
            rule: s.rule,
            approverSpec: toInputJson(s.approverSpec),
            status: 'PENDING',
          })),
        },
      },
      include: { steps: true },
    });
  }

  recordAction(data: {
    organizationId: string;
    requestId: string;
    actorId: string;
    actorType: string;
    action: string;
    comment?: string;
  }) {
    return this.prisma.approvalAction.create({
      data: {
        organizationId: data.organizationId,
        requestId: data.requestId,
        actorId: data.actorId,
        actorType: data.actorType,
        action: data.action,
        comment: data.comment,
      },
    });
  }

  updateRequestStatus(organizationId: string, id: string, status: string) {
    return this.prisma.approvalRequest.updateMany({
      where: { id, organizationId },
      data: { status },
    });
  }
}
