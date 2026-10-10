import { Injectable, Logger } from '@nestjs/common';
import { DomainEventTypes } from '@agency-os/contracts';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { CapabilityExecutorService } from '../../../capabilities/application/services/capability-executor.service';
import { MembersService } from '../../../identity/application/services/members.service';
import { WorkService } from '../../../work/application/services/work.service';
import {
  AutomationRepository,
  type AutomationDefinition,
} from '../../infrastructure/repositories/automation.repository';

const ACTION_CAPABILITY = 'capability.execute';

@Injectable()
export class AutomationExecutionService {
  private readonly logger = new Logger(AutomationExecutionService.name);

  constructor(
    private readonly repository: AutomationRepository,
    private readonly capabilities: CapabilityExecutorService,
    private readonly work: WorkService,
    private readonly members: MembersService,
    private readonly outbox: OutboxService,
  ) {}

  async executeRun(
    organizationId: string,
    runId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const run = await this.repository.findRunById(organizationId, runId);
    if (!run) return;

    await this.repository.updateRun(organizationId, runId, {
      status: 'RUNNING',
      startedAt: new Date(),
    });

    const version = run.version;
    const definition = {
      trigger: version.trigger as AutomationDefinition['trigger'],
      actions: version.actions as AutomationDefinition['actions'],
    };

    try {
      await this.executeAction(
        organizationId,
        actor,
        definition.actions,
        runId,
      );
      await this.repository.updateRun(organizationId, runId, {
        status: 'SUCCEEDED',
        completedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Automation run ${runId} failed: ${String(error)}`);
      await this.repository.updateRun(organizationId, runId, {
        status: 'FAILED',
        completedAt: new Date(),
        context: { error: String(error) },
      });
    }
  }

  private async executeAction(
    organizationId: string,
    actor: AuthenticatedUser,
    action: unknown,
    runId: string,
  ): Promise<void> {
    const type = this.actionType(action);
    const payload = this.actionPayload(action);

    switch (type) {
      case 'create.task':
        await this.work.createTask(organizationId, actor.userId, {
          title: (payload.title as string) ?? 'Automation task',
          description: payload.description as string | undefined,
          projectId: payload.projectId as string | undefined,
          clientId: payload.clientId as string | undefined,
        });
        return;
      case 'notify.team':
      case 'notify.client': {
        const title =
          (typeof payload.title === 'string' && payload.title) ||
          'Automation notification';
        const body =
          typeof payload.body === 'string' ? payload.body : undefined;
        const members = await this.members.list(organizationId);
        const recipientIds = members
          .filter((m) =>
            type === 'notify.client'
              ? m.membershipType === 'CLIENT'
              : m.membershipType !== 'CLIENT',
          )
          .map((m) => m.id);
        if (recipientIds.length === 0) {
          this.logger.warn(`Automation ${type}: no recipients`);
          return;
        }
        await this.outbox.write({
          type: DomainEventTypes.AUTOMATION_NOTIFY,
          version: 1,
          organizationId,
          payload: {
            title: body ? `${title}: ${body}` : title,
            recipientIds,
            runId,
          },
          actor: { id: actor.userId, type: 'user' },
        });
        return;
      }
      case ACTION_CAPABILITY:
      case 'capability.execute': {
        const toolId = payload.toolId as string;
        const input = (payload.input ?? {}) as Record<string, unknown>;
        await this.capabilities.execute(organizationId, actor, {
          toolId,
          input,
          runId,
        });
        return;
      }
      case 'noop':
      case 'manual':
        return;
      default:
        this.logger.warn(`Unhandled automation action: ${type}`);
    }
  }

  private actionType(action: unknown): string {
    if (action && typeof action === 'object' && 'type' in action) {
      const type = (action as { type: unknown }).type;
      return typeof type === 'string' ? type : 'noop';
    }
    return 'noop';
  }

  private actionPayload(action: unknown): Record<string, unknown> {
    if (action && typeof action === 'object' && 'payload' in action) {
      const payload = (action as { payload: unknown }).payload;
      if (payload && typeof payload === 'object') return payload as Record<string, unknown>;
    }
    return {};
  }
}
