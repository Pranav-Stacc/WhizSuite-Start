import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  type CapabilityExecuteResult,
  type CapabilityDefinition,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AgentRepository } from '../../../agent/infrastructure/repositories/agent.repository';
import {
  CapabilityHandlersService,
  type CapabilityContext,
} from './capability-handlers.service';
import { CapabilityRegistryService } from './capability-registry.service';

export interface ExecuteCapabilityInput {
  toolId: string;
  input: Record<string, unknown>;
  pendingActionId?: string;
  runId?: string;
  idempotencyKey?: string;
}

@Injectable()
export class CapabilityExecutorService {
  constructor(
    private readonly registry: CapabilityRegistryService,
    private readonly handlers: CapabilityHandlersService,
    private readonly agentRepo: AgentRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async execute(
    organizationId: string,
    actor: AuthenticatedUser,
    request: ExecuteCapabilityInput,
  ): Promise<CapabilityExecuteResult> {
    const def = this.registry.get(request.toolId);
    if (!def) {
      throw problem(
        HttpStatus.NOT_FOUND,
        'Not Found',
        ErrorCodes.NOT_FOUND,
        `Unknown tool: ${request.toolId}`,
      );
    }
    if (!this.registry.canUserAccess(def, actor.permissions ?? [])) {
      throw problem(
        HttpStatus.FORBIDDEN,
        'Forbidden',
        ErrorCodes.FORBIDDEN,
        `Missing permissions for ${request.toolId}`,
      );
    }

    const parsed = def.inputSchema.safeParse(request.input);
    if (!parsed.success) {
      throw problem(
        HttpStatus.BAD_REQUEST,
        'Bad Request',
        ErrorCodes.VALIDATION_FAILED,
        parsed.error.message,
      );
    }

    const needsConfirm =
      this.registry.requiresConfirmation(def) && !request.pendingActionId;

    if (needsConfirm && request.runId) {
      const pending = await this.agentRepo.createPendingAction({
        organizationId,
        runId: request.runId,
        userId: actor.userId,
        toolId: request.toolId,
        input: parsed.data as Record<string, unknown>,
        summary: this.summarizeAction(def, parsed.data as Record<string, unknown>),
        expiresAt: new Date(
          Date.now() +
            this.config.get('AGENT_PENDING_ACTION_TTL_SECONDS', { infer: true }) *
              1000,
        ),
      });
      return {
        status: 'pending_confirmation',
        pendingActionId: pending.id,
        message: pending.summary,
      };
    }

    if (request.pendingActionId) {
      const pending = await this.agentRepo.findPendingAction(
        organizationId,
        request.pendingActionId,
      );
      if (!pending || pending.userId !== actor.userId || pending.status !== 'PENDING') {
        throw problem(
          HttpStatus.BAD_REQUEST,
          'Bad Request',
          ErrorCodes.VALIDATION_FAILED,
          'Invalid or expired pending action',
        );
      }
      await this.agentRepo.resolvePendingAction(pending.id, 'CONFIRMED');
    }

    const ctx: CapabilityContext = { organizationId, actor };
    const output = await this.handlers.execute(
      request.toolId,
      parsed.data as Record<string, unknown>,
      ctx,
    );

    await this.audit.record({
      organizationId,
      actorId: actor.userId,
      actorType: 'user',
      action: `capability.${request.toolId}`,
      entityType: 'capability',
      entityId: request.toolId,
      after: { input: this.redact(parsed.data as Record<string, unknown>) },
      outcome: 'SUCCESS',
    });

    return { status: 'ok', output };
  }

  private summarizeAction(
    def: CapabilityDefinition,
    input: Record<string, unknown>,
  ): string {
    return `${def.name}: ${JSON.stringify(input).slice(0, 200)}`;
  }

  private redact(input: Record<string, unknown>): Record<string, unknown> {
    const copy = { ...input };
    for (const key of Object.keys(copy)) {
      if (/password|secret|token/i.test(key)) copy[key] = '[redacted]';
    }
    return copy;
  }
}
