import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  unprocessable,
} from '../../../../shared/errors/problem-details.exception';
import {
  AUTOMATION_STATUS,
  AutomationRepository,
  type AutomationDefinition,
} from '../../infrastructure/repositories/automation.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AutomationExecutionQueue } from '../../jobs/automation-execution.queue';
import type {
  CreateAutomationDto,
  PublishAutomationDto,
  UpdateAutomationDto,
} from '../../interface/http/dto/automation.dto';

const ENTITY_TYPE = 'automation';

type AutomationRow = NonNullable<
  Awaited<ReturnType<AutomationRepository['findById']>>
>;
type RunStats = { runs: number; failures: number; lastRunAt: Date | null };

function typeOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'type' in value) {
    const type = value.type;
    return typeof type === 'string' ? type : null;
  }
  return null;
}

function definitionFor(trigger: string, action: string): AutomationDefinition {
  return { trigger: { type: trigger }, actions: { type: action } };
}

function toDto(row: AutomationRow, stats: RunStats | undefined) {
  const [latest] = row.versions;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    enabled: row.status === AUTOMATION_STATUS.ACTIVE,
    trigger: typeOf(latest?.trigger),
    action: typeOf(latest?.actions),
    runs: stats?.runs ?? 0,
    failures: stats?.failures ?? 0,
    lastRunAt: stats?.lastRunAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class AutomationService {
  constructor(
    private readonly repository: AutomationRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly executionQueue: AutomationExecutionQueue,
  ) {}

  async list(organizationId: string) {
    const rows = await this.repository.list(
      organizationId,
      this.config.get('AUTOMATION_LIST_LIMIT', { infer: true }),
    );
    const stats = await this.repository.runStats(
      organizationId,
      rows.map((r) => r.id),
    );
    return rows.map((row) => toDto(row, stats.get(row.id)));
  }

  async get(organizationId: string, id: string) {
    const row = await this.find(organizationId, id);
    const stats = await this.repository.runStats(organizationId, [id]);
    return toDto(row, stats.get(id));
  }

  async listRuns(organizationId: string) {
    const runs = await this.repository.listRuns(
      organizationId,
      this.config.get('AUTOMATION_RUN_LIST_LIMIT', { infer: true }),
    );
    return runs.map((run) => {
      const context = (run.context ?? {}) as Record<string, unknown>;
      return {
        id: run.id,
        automationId: run.version.automationId,
        automationName: run.version.automation.name,
        status: run.status,
        detail: typeof context.detail === 'string' ? context.detail : null,
        createdAt: run.createdAt,
      };
    });
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateAutomationDto,
  ) {
    const status =
      input.enabled === false
        ? AUTOMATION_STATUS.PAUSED
        : AUTOMATION_STATUS.ACTIVE;
    const created = await this.repository.createWithVersion(
      organizationId,
      { name: input.name, status },
      definitionFor(input.trigger, input.action),
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'automations.create',
      entityType: ENTITY_TYPE,
      entityId: created.id,
      after: {
        name: input.name,
        trigger: input.trigger,
        action: input.action,
        status,
      },
    });
    return this.get(organizationId, created.id);
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateAutomationDto,
  ) {
    const before = await this.get(organizationId, id);
    const trigger = input.trigger ?? before.trigger;
    const action = input.action ?? before.action;
    if (
      (input.trigger || input.action) &&
      trigger &&
      action &&
      (trigger !== before.trigger || action !== before.action)
    ) {
      await this.repository.createVersion(
        organizationId,
        id,
        definitionFor(trigger, action),
      );
    }
    const status =
      input.enabled === undefined
        ? undefined
        : input.enabled
          ? AUTOMATION_STATUS.ACTIVE
          : AUTOMATION_STATUS.PAUSED;
    if (input.name !== undefined || status !== undefined) {
      await this.repository.update(organizationId, id, {
        name: input.name,
        status,
      });
    }
    const after = await this.get(organizationId, id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'automations.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: {
        name: before.name,
        trigger: before.trigger,
        action: before.action,
        status: before.status,
      },
      after: {
        name: after.name,
        trigger: after.trigger,
        action: after.action,
        status: after.status,
      },
    });
    return after;
  }

  async archive(organizationId: string, actorId: string, id: string) {
    const before = await this.find(organizationId, id);
    await this.repository.update(organizationId, id, {
      status: AUTOMATION_STATUS.ARCHIVED,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'automations.archive',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { name: before.name, status: before.status },
      after: { status: AUTOMATION_STATUS.ARCHIVED },
    });
  }

  async publish(
    organizationId: string,
    actorId: string,
    id: string,
    input: PublishAutomationDto,
  ) {
    const current = await this.get(organizationId, id);
    const trigger = input.trigger ?? current.trigger;
    const action = input.action ?? current.action;
    if (!trigger || !action) {
      throw unprocessable('A trigger and an action are required to publish');
    }
    const version = await this.repository.createVersion(
      organizationId,
      id,
      definitionFor(trigger, action),
    );
    await this.repository.update(organizationId, id, {
      status: AUTOMATION_STATUS.ACTIVE,
    });
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
    detail?: string,
  ) {
    const automation = await this.find(organizationId, id);
    const version =
      (await this.repository.findLatestPublishedVersion(organizationId, id)) ??
      (await this.repository.createVersion(organizationId, id, {
        trigger: { type: 'manual' },
        actions: { type: 'noop' },
      }));
    const run = await this.repository.createRun(
      organizationId,
      version.id,
      {
        automationId: automation.id,
        triggeredBy: actorId,
        ...(detail ? { detail } : {}),
      },
      'QUEUED',
    );
    await this.executionQueue.enqueue({
      organizationId,
      runId: run.id,
      actorId,
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

  private async find(
    organizationId: string,
    id: string,
  ): Promise<AutomationRow> {
    const row = await this.repository.findById(organizationId, id);
    if (!row) throw notFound();
    return row;
  }
}
