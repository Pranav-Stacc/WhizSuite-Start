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
import { normalizeCapabilityInput } from '../utils/normalize-capability-input';

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

    const pending = request.pendingActionId
      ? await this.loadConfirmablePendingAction(organizationId, actor, request)
      : null;

    // A confirmation executes exactly what was approved, never a resubmitted input.
    const normalized = normalizeCapabilityInput(
      request.toolId,
      pending
        ? (pending.input as Record<string, unknown>)
        : (request.input ?? {}),
    );
    const parsed = def.inputSchema.safeParse(normalized);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw problem(
        HttpStatus.BAD_REQUEST,
        'Bad Request',
        ErrorCodes.VALIDATION_FAILED,
        detail || parsed.error.message,
      );
    }

    const needsConfirm = this.registry.requiresConfirmation(def) && !pending;

    if (needsConfirm && request.runId) {
      const created = await this.agentRepo.createPendingAction({
        organizationId,
        runId: request.runId,
        userId: actor.userId,
        toolId: request.toolId,
        input: parsed.data as Record<string, unknown>,
        summary: this.summarizeAction(
          def,
          parsed.data as Record<string, unknown>,
        ),
        expiresAt: new Date(
          Date.now() +
            this.config.get('AGENT_PENDING_ACTION_TTL_SECONDS', {
              infer: true,
            }) *
              1000,
        ),
      });
      return {
        status: 'pending_confirmation',
        pendingActionId: created.id,
        message: created.summary,
      };
    }

    if (pending) {
      await this.agentRepo.resolvePendingAction(pending.id, 'CONFIRMED');
    }

    const ctx: CapabilityContext = { organizationId, actor };
    const output = await this.handlers.execute(
      request.toolId,
      parsed.data as Record<string, unknown>,
      ctx,
    );

    // entityId is UUID-typed in audit — never store toolId there.
    await this.audit.record({
      organizationId,
      actorId: actor.userId,
      actorType: 'user',
      action: `capability.${request.toolId}`,
      entityType: 'capability',
      after: {
        toolId: request.toolId,
        input: this.redact(parsed.data as Record<string, unknown>),
      },
      metadata: { toolId: request.toolId, riskTier: def.riskTier },
      outcome: 'SUCCESS',
    });

    return { status: 'ok', output };
  }

  async executeBatch(
    organizationId: string,
    actor: AuthenticatedUser,
    calls: ExecuteCapabilityInput[],
  ): Promise<
    Array<{
      toolId: string;
      ok: boolean;
      result?: CapabilityExecuteResult;
      error?: string;
    }>
  > {
    const maxSize = this.config.get('CAPABILITY_BATCH_MAX_SIZE', {
      infer: true,
    });
    const concurrency = this.config.get('CAPABILITY_BATCH_CONCURRENCY', {
      infer: true,
    });
    const slice = calls.slice(0, maxSize);
    const results: Array<{
      toolId: string;
      ok: boolean;
      result?: CapabilityExecuteResult;
      error?: string;
    }> = [];

    for (let offset = 0; offset < slice.length; offset += concurrency) {
      const chunk = slice.slice(offset, offset + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (call) => {
          try {
            const result = await this.execute(organizationId, actor, call);
            return { toolId: call.toolId, ok: true, result };
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Tool execution failed';
            return { toolId: call.toolId, ok: false, error: message };
          }
        }),
      );
      results.push(...chunkResults);
    }

    return results;
  }

  private async loadConfirmablePendingAction(
    organizationId: string,
    actor: AuthenticatedUser,
    request: ExecuteCapabilityInput,
  ) {
    const pending = await this.agentRepo.findPendingAction(
      organizationId,
      request.pendingActionId ?? '',
    );
    const valid =
      pending &&
      pending.userId === actor.userId &&
      pending.status === 'PENDING' &&
      pending.toolId === request.toolId &&
      pending.expiresAt.getTime() > Date.now();
    if (!valid) {
      throw problem(
        HttpStatus.BAD_REQUEST,
        'Bad Request',
        ErrorCodes.VALIDATION_FAILED,
        'Invalid or expired pending action',
      );
    }
    return pending;
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
