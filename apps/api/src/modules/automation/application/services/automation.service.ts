import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

@Injectable()
export class AutomationService {
  constructor(
    private readonly repository: AutomationRepository,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.repository.list(organizationId);
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (!item) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return item;
  }

  async create(organizationId: string, actorId: string, data: Record<string, unknown>) {
    const item = await this.repository.create(organizationId, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'automations.create',
      entityType: 'automation',
      entityId: (item as { id: string }).id,
      after: item as Record<string, unknown>,
    });
    return item;
  }

  async update(organizationId: string, actorId: string, id: string, data: Record<string, unknown>) {
    await this.get(organizationId, id);
    await this.repository.update(organizationId, id, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'automations.update',
      entityType: 'automation',
      entityId: id,
      after: data,
    });
    return this.get(organizationId, id);
  }

  async publish(
    organizationId: string,
    actorId: string,
    id: string,
    definition: {
      trigger: Record<string, unknown>;
      conditions?: Record<string, unknown>;
      actions: Record<string, unknown>;
    },
  ) {
    await this.get(organizationId, id);
    const version = await this.repository.createVersion(organizationId, id, definition);
    await this.repository.update(organizationId, id, { status: 'ACTIVE' });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'automations.publish',
      entityType: 'automationVersion',
      entityId: version.id,
      after: { automationId: id, version: version.version },
    });
    return version;
  }

  async run(
    organizationId: string,
    actorId: string,
    id: string,
    context?: Record<string, unknown>,
  ) {
    const automation = await this.get(organizationId, id);
    let version = await this.repository.findLatestPublishedVersion(organizationId, id);
    if (!version) {
      version = await this.repository.createVersion(organizationId, id, {
        trigger: { type: 'manual' },
        actions: { type: 'noop' },
      });
    }
    const run = await this.repository.createRun(organizationId, version.id, {
      ...context,
      automationId: automation.id,
      triggeredBy: actorId,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'automations.run',
      entityType: 'automationRun',
      entityId: run.id,
      after: { automationId: id, status: run.status },
    });
    return run;
  }
}
