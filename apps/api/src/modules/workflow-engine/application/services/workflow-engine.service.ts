import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { WorkflowEngineRepository } from '../../infrastructure/repositories/workflow-engine.repository';
@Injectable()
export class WorkflowEngineService {
  constructor(private readonly repository: WorkflowEngineRepository) {}

  list(organizationId: string) {
    return this.repository.listDefinitions(organizationId);
  }

  async getVersion(organizationId: string, versionId: string) {
    const version = await this.repository.findVersion(organizationId, versionId);
    if (!version) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return version;
  }

  async createDefinition(
    organizationId: string,
    input: {
      entityType: string;
      name: string;
      states: Array<Record<string, unknown>>;
      transitions: Array<Record<string, unknown>>;
    },
  ) {
    const definition = await this.repository.createDefinition(organizationId, {
      entityType: input.entityType,
      name: input.name,
    });
    const version = await this.repository.createVersion(organizationId, {
      definitionId: definition.id,
      version: 1,
      states: input.states,
      transitions: input.transitions,
    });
    return version;
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
