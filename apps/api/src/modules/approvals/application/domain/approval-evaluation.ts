import { HttpStatus } from '@nestjs/common';
import { ErrorCodes, type ApprovalAction } from '@agency-os/contracts';
import { problem } from '../../../../shared/errors/problem-details.exception';
import type { ApprovalTransition } from '../../infrastructure/repositories/approvals.repository';

const PENDING = 'PENDING';
const APPROVED = 'APPROVED';
const RULE_ALL = 'ALL';

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

export function approverIdsOf(
  step: Pick<EvaluatedStep, 'approverSpec'>,
): string[] {
  const spec = step.approverSpec;
  if (typeof spec !== 'object' || spec === null || !('approverIds' in spec))
    return [];
  const ids = spec.approverIds;
  return Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string')
    : [];
}

function conflict(detail: string) {
  return problem(HttpStatus.CONFLICT, 'Conflict', ErrorCodes.CONFLICT, detail);
}

/**
 * Steps run in order; only the first pending step accepts actions. An `ANY` step (or one without
 * named approvers) completes on the first approval; an `ALL` step waits for every named approver.
 * A rejection or change request on any step ends the request immediately.
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
  const stepComplete =
    step.rule !== RULE_ALL || approverIds.every((id) => approvedBy.has(id));
  if (!stepComplete) return { stepId: step.id, stepStatus: PENDING };

  const isLastStep = steps.every(
    (s) => s.id === step.id || s.status !== PENDING,
  );
  return {
    stepId: step.id,
    stepStatus: APPROVED,
    requestStatus: isLastStep ? APPROVED : undefined,
  };
}
