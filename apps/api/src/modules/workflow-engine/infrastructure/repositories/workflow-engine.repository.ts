import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

@Injectable()
export class WorkflowEngineRepository {
  constructor(private readonly prisma: PrismaService) {}

  listDefinitions(organizationId: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { organizationId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
  }

  findVersion(organizationId: string, versionId: string) {
    return this.prisma.workflowVersion.findFirst({
      where: { id: versionId, organizationId },
      include: { states: true, transitions: true },
    });
  }

  createDefinition(organizationId: string, data: { entityType: string; name: string }) {
    return this.prisma.workflowDefinition.create({
      data: { organizationId, entityType: data.entityType, name: data.name },
    });
  }

  async createVersion(
    organizationId: string,
    data: {
      definitionId: string;
      version: number;
      states: Array<Record<string, unknown>>;
      transitions: Array<Record<string, unknown>>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.workflowVersion.create({
        data: {
          organizationId,
          definitionId: data.definitionId,
          version: data.version,
          status: 'DRAFT',
        },
      });

      for (const [idx, state] of data.states.entries()) {
        await tx.workflowState.create({
          data: {
            organizationId,
            versionId: version.id,
            key: String(state.key ?? `state_${idx}`),
            name: String(state.name ?? `State ${idx}`),
            color: state.color as string | undefined,
            category: String(state.category ?? 'ACTIVE'),
            order: Number(state.order ?? idx),
            isInitial: Boolean(state.isInitial),
            isTerminal: Boolean(state.isTerminal),
            guards: toInputJson(state.guards),
          },
        });
      }

      for (const transition of data.transitions) {
        await tx.workflowTransition.create({
          data: {
            organizationId,
            versionId: version.id,
            fromStateKey: String(transition.fromStateKey),
            toStateKey: String(transition.toStateKey),
            label: transition.label as string | undefined,
            guards: toInputJson(transition.guards),
            actions: toInputJson(transition.actions),
          },
        });
      }

      return tx.workflowVersion.findFirst({
        where: { id: version.id },
        include: { states: true, transitions: true },
      });
    });
  }

  publishVersion(organizationId: string, versionId: string) {
    return this.prisma.workflowVersion.updateMany({
      where: { id: versionId, organizationId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }
}
