import { HttpStatus } from '@nestjs/common';
import {
  ErrorCodes,
  type ApprovalAction,
  type ApproverSpec,
} from '@agency-os/contracts';
import { problem } from '../../../../shared/errors/problem-details.exception';
import type { ApprovalTransition } from '../../infrastructure/repositories/approvals.repository';

const PENDING = 'PENDING';
const APPROVED = 'APPROVED';
const RULE_ALL = 'ALL';
const RULE_QUORUM = 'QUORUM';

export interface EvaluatedStep {
  id: string;
  order: number;
  rule: string;
  status: string;
  approverSpec: unknown;
}

export interface EvaluatedRequest {
  status: string;
  steps: EvaluatedStep[];
  actions: Array<{ stepId: string | null; actorId: string; action: string }>;
}

export function parseApproverSpec(raw: unknown): ApproverSpec {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const spec = raw as Record<string, unknown>;
  const asIds = (value: unknown) =>
    Array.isArray(value)
      ? value.filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        )
      : [];
  const basisRaw = spec.basis;
  const basis =
    typeof basisRaw === 'string' ? (basisRaw as ApproverSpec['basis']) : undefined;
  return {
    approverIds: asIds(spec.approverIds),
    roleIds: asIds(spec.roleIds),
    resolvedUserIds: asIds(spec.resolvedUserIds),
    basis,
    targetIds: asIds(spec.targetIds),
    scopeType: typeof spec.scopeType === 'string' ? spec.scopeType : undefined,
    scopeResourceId:
      typeof spec.scopeResourceId === 'string' ? spec.scopeResourceId : null,
    quorumCount:
      typeof spec.quorumCount === 'number' && Number.isFinite(spec.quorumCount)
        ? Math.max(1, Math.floor(spec.quorumCount))
        : undefined,
  };
}

/** Effective named user pool for a step (resolved at create, else explicit ids). */
export function approverIdsOf(
  step: Pick<EvaluatedStep, 'approverSpec'>,
): string[] {
  const spec = parseApproverSpec(step.approverSpec);
  const resolved = spec.resolvedUserIds ?? [];
  if (resolved.length > 0) return [...new Set(resolved)];
  return [...new Set(spec.approverIds ?? [])];
}

function conflict(detail: string) {
  return problem(HttpStatus.CONFLICT, 'Conflict', ErrorCodes.CONFLICT, detail);
}

function stepComplete(
  rule: string,
  approverIds: string[],
  approvedBy: Set<string>,
  quorumCount?: number,
): boolean {
  if (approverIds.length === 0) return true;
  if (rule === RULE_ALL) return approverIds.every((id) => approvedBy.has(id));
  if (rule === RULE_QUORUM) {
    const needed = Math.min(quorumCount ?? 1, approverIds.length);
    return approvedBy.size >= needed;
  }
  return approvedBy.size >= 1;
}

/**
 * Steps run in order; only the first pending step accepts actions.
 * ANY — first approval completes the step.
 * ALL — every named approver must approve.
 * QUORUM — at least `quorumCount` named approvers must approve.
 * Empty named pool — anyone with approvals.approve may act (first approval completes).
 */
export function evaluateApprovalAction(
  request: EvaluatedRequest,
  actorId: string,
  action: ApprovalAction,
): ApprovalTransition {
  if (request.status !== PENDING)
    throw conflict(`Approval is already ${request.status}`);
  const steps = [...request.steps].sort((a, b) => a.order - b.order);
  const step = steps.find((s) => s.status === PENDING);
  if (!step) throw conflict('Approval has no pending step');

  const spec = parseApproverSpec(step.approverSpec);
  const approverIds = approverIdsOf(step);
  if (approverIds.length > 0 && !approverIds.includes(actorId)) {
    throw problem(
      HttpStatus.FORBIDDEN,
      'Forbidden',
      ErrorCodes.FORBIDDEN,
      'You are not an approver for this step',
    );
  }
  const stepActions = request.actions.filter((a) => a.stepId === step.id);
  if (stepActions.some((a) => a.actorId === actorId))
    throw conflict('You have already acted on this step');

  if (action !== APPROVED)
    return { stepId: step.id, stepStatus: action, requestStatus: action };

  const approvedBy = new Set(
    stepActions.filter((a) => a.action === APPROVED).map((a) => a.actorId),
  );
  approvedBy.add(actorId);
  if (!stepComplete(step.rule, approverIds, approvedBy, spec.quorumCount)) {
    return { stepId: step.id, stepStatus: PENDING };
  }

  const isLastStep = steps.every(
    (s) => s.id === step.id || s.status !== PENDING,
  );
  return {
    stepId: step.id,
    stepStatus: APPROVED,
    requestStatus: isLastStep ? APPROVED : undefined,
  };
}
