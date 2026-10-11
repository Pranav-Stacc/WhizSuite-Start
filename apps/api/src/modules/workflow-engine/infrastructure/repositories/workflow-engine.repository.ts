import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

export const VERSION_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

const DEFAULT_STATE_CATEGORY = 'ACTIVE';

function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

export interface WorkflowSettings {
  name?: string;
  entityType?: string;
  scopeType?: string;
  scopeId?: string | null;
  slaHours?: number | null;
  requiresClientApproval?: boolean;
  active?: boolean;
}

export interface VersionInput {
  states: Array<Record<string, unknown>>;
  transitions: Array<Record<string, unknown>>;
  publish?: boolean;
}

const latestVersionWithStates = {
  orderBy: { version: 'desc' as const },
  take: 1,
  include: { states: { orderBy: { order: 'asc' as const } } },
};

@Injectable()
export class WorkflowEngineRepository {
  constructor(private readonly prisma: PrismaService) {}

  listDefinitions(organizationId: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: { versions: latestVersionWithStates },
    });
  }

  findDefinition(organizationId: string, id: string) {
    return this.prisma.workflowDefinition.findFirst({
      where: { id, organizationId },
      include: { versions: latestVersionWithStates },
    });
  }

  findVersion(organizationId: string, versionId: string) {
    return this.prisma.workflowVersion.findFirst({
      where: { id: versionId, organizationId },
      include: { states: true, transitions: true },
    });
  }

  createDefinition(
    organizationId: string,
    data: WorkflowSettings & { entityType: string; name: string },
  ) {
    return this.prisma.workflowDefinition.create({
      data: {
        organizationId,
        entityType: data.entityType,
        name: data.name,
        scopeType: data.scopeType ?? 'ORGANIZATION',
        scopeId: data.scopeId ?? null,
        slaHours: data.slaHours ?? null,
        requiresClientApproval: data.requiresClientApproval ?? false,
        active: data.active ?? true,
      },
    });
  }

  updateDefinition(organizationId: string, id: string, data: WorkflowSettings) {
    return this.prisma.workflowDefinition.updateMany({
      where: { id, organizationId },
      data,
    });
  }

  deleteDefinition(organizationId: string, id: string) {
    return this.prisma.workflowDefinition.deleteMany({
      where: { id, organizationId },
    });
  }

  /** Creates the next version of a definition with its states and transitions in one transaction. */
  createVersion(
    organizationId: string,
    definitionId: string,
    data: VersionInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.workflowVersion.findFirst({
        where: { organizationId, definitionId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = await tx.workflowVersion.create({
        data: {
          organizationId,
          definitionId,
          version: (latest?.version ?? 0) + 1,
          status: data.publish
            ? VERSION_STATUS.PUBLISHED
            : VERSION_STATUS.DRAFT,
          publishedAt: data.publish ? new Date() : null,
        },
      });

      await tx.workflowState.createMany({
        data: data.states.map((state, idx) => ({
          organizationId,
          versionId: version.id,
          key: textOr(state.key, `state_${idx}`),
          name: textOr(state.name, `State ${idx}`),
          color: typeof state.color === 'string' ? state.color : undefined,
          category: textOr(state.category, DEFAULT_STATE_CATEGORY),
          order: Number(state.order ?? idx),
          isInitial: Boolean(state.isInitial),
          isTerminal: Boolean(state.isTerminal),
          guards: toInputJson(state.guards),
        })),
      });

      await tx.workflowTransition.createMany({
        data: data.transitions.map((transition) => ({
          organizationId,
          versionId: version.id,
          fromStateKey: String(transition.fromStateKey),
          toStateKey: String(transition.toStateKey),
          label: transition.label as string | undefined,
          guards: toInputJson(transition.guards),
          actions: toInputJson(transition.actions),
        })),
      });

      return tx.workflowVersion.findFirst({
        where: { id: version.id },
        include: { states: true, transitions: true },
      });
    });
  }

  publishVersion(organizationId: string, versionId: string) {
    return this.prisma.workflowVersion.updateMany({
      where: { id: versionId, organizationId },
      data: { status: VERSION_STATUS.PUBLISHED, publishedAt: new Date() },
    });
  }
}
