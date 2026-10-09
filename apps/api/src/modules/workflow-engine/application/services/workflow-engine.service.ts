import { Injectable } from '@nestjs/common';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import {
  WorkflowEngineRepository,
  type VersionInput,
} from '../../infrastructure/repositories/workflow-engine.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import type {
  CreateWorkflowDto,
  UpdateWorkflowDto,
} from '../../interface/http/dto/workflow.dto';

const ENTITY_TYPE = 'workflowDefinition';

type DefinitionRow = NonNullable<
  Awaited<ReturnType<WorkflowEngineRepository['findDefinition']>>
>;

const stateKey = (name: string, idx: number) =>
  `${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'stage'
  }_${idx}`;

/** A linear pipeline: each stage moves forward to the next one. */
function linearVersion(stages: string[]): VersionInput {
  const keys = stages.map(stateKey);
  return {
    publish: true,
    states: stages.map((name, idx) => ({
      key: keys[idx],
      name,
      order: idx,
      isInitial: idx === 0,
      isTerminal: idx === stages.length - 1,
    })),
    transitions: keys
      .slice(1)
      .map((toStateKey, idx) => ({ fromStateKey: keys[idx], toStateKey })),
  };
}

function toDto(row: DefinitionRow) {
  const [latest] = row.versions;
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
    stages: latest?.states.map((s) => s.name) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const sameStages = (a: string[], b: string[]) =>
  a.length === b.length && a.every((s, i) => s === b[i]);

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
    if (stages && !sameStages(stages, before.stages)) {
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
