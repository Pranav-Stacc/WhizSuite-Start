import { Injectable } from '@nestjs/common';
import type { ApprovalStepRule } from '@agency-os/contracts';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import {
  WorkflowEngineRepository,
  type VersionInput,
} from '../../infrastructure/repositories/workflow-engine.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import type {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowStageDto,
} from '../../interface/http/dto/workflow.dto';

const ENTITY_TYPE = 'workflowDefinition';
const DEFAULT_RULE: ApprovalStepRule = 'ANY';

type DefinitionRow = NonNullable<
  Awaited<ReturnType<WorkflowEngineRepository['findDefinition']>>
>;

export type WorkflowStageView = {
  name: string;
  assigneeRoleId: string | null;
  approvalRule: ApprovalStepRule;
  quorumCount?: number;
  approverIds: string[];
  roleIds: string[];
  scopeType?: string;
  scopeResourceId?: string | null;
};

type StageGuards = {
  assigneeRoleId?: string | null;
  approvalRule?: string;
  quorumCount?: number;
  approverIds?: string[];
  roleIds?: string[];
  scopeType?: string;
  scopeResourceId?: string | null;
};

const stateKey = (name: string, idx: number) =>
  `${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'stage'
  }_${idx}`;

function asIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((id): id is string => typeof id === 'string' && !!id),
    ),
  ];
}

function normalizeStage(stage: WorkflowStageDto): WorkflowStageView {
  const roleIds = asIds([
    ...(stage.roleIds ?? []),
    ...(stage.assigneeRoleId ? [stage.assigneeRoleId] : []),
  ]);
  const approvalRule = stage.approvalRule ?? DEFAULT_RULE;
  return {
    name: stage.name,
    assigneeRoleId: stage.assigneeRoleId ?? roleIds[0] ?? null,
    approvalRule,
    quorumCount:
      approvalRule === 'QUORUM' ? (stage.quorumCount ?? 1) : stage.quorumCount,
    approverIds: asIds(stage.approverIds),
    roleIds,
    scopeType: stage.scopeType,
    scopeResourceId: stage.scopeResourceId ?? null,
  };
}

function stageGuards(stage: WorkflowStageView): StageGuards {
  return {
    assigneeRoleId: stage.assigneeRoleId,
    approvalRule: stage.approvalRule,
    quorumCount: stage.quorumCount,
    approverIds: stage.approverIds,
    roleIds: stage.roleIds,
    scopeType: stage.scopeType,
    scopeResourceId: stage.scopeResourceId ?? null,
  };
}

function readStageGuards(guards: unknown): Omit<WorkflowStageView, 'name'> {
  if (!guards || typeof guards !== 'object' || Array.isArray(guards)) {
    return {
      assigneeRoleId: null,
      approvalRule: DEFAULT_RULE,
      approverIds: [],
      roleIds: [],
      scopeResourceId: null,
    };
  }
  const raw = guards as StageGuards;
  const roleIds = asIds([
    ...(raw.roleIds ?? []),
    ...(typeof raw.assigneeRoleId === 'string' && raw.assigneeRoleId
      ? [raw.assigneeRoleId]
      : []),
  ]);
  const approvalRule =
    raw.approvalRule === 'ALL' ||
    raw.approvalRule === 'QUORUM' ||
    raw.approvalRule === 'ANY'
      ? raw.approvalRule
      : DEFAULT_RULE;
  return {
    assigneeRoleId:
      typeof raw.assigneeRoleId === 'string' && raw.assigneeRoleId
        ? raw.assigneeRoleId
        : (roleIds[0] ?? null),
    approvalRule,
    quorumCount:
      typeof raw.quorumCount === 'number' && Number.isFinite(raw.quorumCount)
        ? Math.max(1, Math.floor(raw.quorumCount))
        : undefined,
    approverIds: asIds(raw.approverIds),
    roleIds,
    scopeType: typeof raw.scopeType === 'string' ? raw.scopeType : undefined,
    scopeResourceId:
      typeof raw.scopeResourceId === 'string' ? raw.scopeResourceId : null,
  };
}

/** A linear pipeline: each stage moves forward to the next one. */
function linearVersion(stages: WorkflowStageDto[]): VersionInput {
  const normalized = stages.map(normalizeStage);
  const keys = normalized.map((stage, idx) => stateKey(stage.name, idx));
  return {
    publish: true,
    states: normalized.map((stage, idx) => ({
      key: keys[idx],
      name: stage.name,
      order: idx,
      isInitial: idx === 0,
      isTerminal: idx === normalized.length - 1,
      guards: stageGuards(stage),
    })),
    transitions: keys
      .slice(1)
      .map((toStateKey, idx) => ({ fromStateKey: keys[idx], toStateKey })),
  };
}

function toStages(
  states: Array<{ name: string; guards: unknown }>,
): WorkflowStageView[] {
  return states.map((state) => ({
    name: state.name,
    ...readStageGuards(state.guards),
  }));
}

function toDto(row: DefinitionRow) {
  const [latest] = row.versions;
  const stages = latest ? toStages(latest.states) : [];
  return {
    id: row.id,
    name: row.name,
    entityType: row.entityType,
    slaHours: row.slaHours,
    requiresClientApproval: row.requiresClientApproval,
    active: row.active,
    version: latest?.version ?? null,
    versionId: latest?.id ?? null,
    versionStatus: latest?.status ?? null,
    stages,
    /** Convenience for older clients that expect stage name strings. */
    stageNames: stages.map((stage) => stage.name),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sameStage(a: WorkflowStageView, b: WorkflowStageDto): boolean {
  const next = normalizeStage(b);
  return (
    a.name === next.name &&
    (a.assigneeRoleId ?? null) === (next.assigneeRoleId ?? null) &&
    a.approvalRule === next.approvalRule &&
    (a.quorumCount ?? null) === (next.quorumCount ?? null) &&
    a.approverIds.join() === next.approverIds.join() &&
    a.roleIds.join() === next.roleIds.join() &&
    (a.scopeType ?? null) === (next.scopeType ?? null) &&
    (a.scopeResourceId ?? null) === (next.scopeResourceId ?? null)
  );
}

const sameStages = (a: WorkflowStageView[], b: WorkflowStageDto[]) =>
  a.length === b.length && a.every((stage, i) => sameStage(stage, b[i]!));

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly repository: WorkflowEngineRepository,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string) {
    return (await this.repository.listDefinitions(organizationId)).map(toDto);
  }

  async get(organizationId: string, id: string) {
    const row = await this.repository.findDefinition(organizationId, id);
    if (!row) throw notFound();
    return toDto(row);
  }

  async getVersion(organizationId: string, versionId: string) {
    const version = await this.repository.findVersion(
      organizationId,
      versionId,
    );
    if (!version) throw notFound();
    return version;
  }

  async createDefinition(
    organizationId: string,
    actorId: string,
    input: CreateWorkflowDto,
  ) {
    const definition = await this.repository.createDefinition(organizationId, {
      entityType: input.entityType,
      name: input.name,
      slaHours: input.slaHours,
      requiresClientApproval: input.requiresClientApproval,
      active: input.active,
    });
    await this.repository.createVersion(
      organizationId,
      definition.id,
      linearVersion(input.stages),
    );
    const created = await this.get(organizationId, definition.id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'workflows.create',
      entityType: ENTITY_TYPE,
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async updateDefinition(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateWorkflowDto,
  ) {
    const before = await this.get(organizationId, id);
    const { stages, ...settings } = input;
    if (stages && !sameStages(before.stages, stages)) {
      await this.repository.createVersion(
        organizationId,
        id,
        linearVersion(stages),
      );
    }
    if (Object.values(settings).some((v) => v !== undefined)) {
      await this.repository.updateDefinition(organizationId, id, settings);
    }
    const after = await this.get(organizationId, id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'workflows.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before,
      after,
    });
    return after;
  }

  async deleteDefinition(organizationId: string, actorId: string, id: string) {
    const before = await this.get(organizationId, id);
    await this.repository.deleteDefinition(organizationId, id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'workflows.delete',
      entityType: ENTITY_TYPE,
      entityId: id,
      before,
    });
  }

  async publishVersion(organizationId: string, versionId: string) {
    await this.getVersion(organizationId, versionId);
    return this.repository.publishVersion(organizationId, versionId);
  }

  async canTransition(
    organizationId: string,
    versionId: string,
    fromState: string,
    toState: string,
  ) {
    const version = await this.getVersion(organizationId, versionId);
    const allowed = version.transitions.some(
      (t) => t.fromStateKey === fromState && t.toStateKey === toState,
    );
    return { allowed };
  }
}
