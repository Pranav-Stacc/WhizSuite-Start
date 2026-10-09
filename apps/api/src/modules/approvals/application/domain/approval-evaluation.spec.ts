import { HttpStatus } from '@nestjs/common';
import type { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import {
  evaluateApprovalAction,
  type EvaluatedRequest,
  type EvaluatedStep,
} from './approval-evaluation';

const ALICE = 'a0000000-0000-4000-8000-000000000001';
const BOB = 'b0000000-0000-4000-8000-000000000002';
const CAROL = 'c0000000-0000-4000-8000-000000000003';

function step(
  id: string,
  order: number,
  overrides: Partial<EvaluatedStep> = {},
): EvaluatedStep {
  return {
    id,
    order,
    rule: 'ANY',
    status: 'PENDING',
    approverSpec: { approverIds: [] },
    ...overrides,
  };
}

function request(
  steps: EvaluatedStep[],
  actions: EvaluatedRequest['actions'] = [],
): EvaluatedRequest {
  return { status: 'PENDING', steps, actions };
}

function statusOf(fn: () => unknown): number {
  try {
    fn();
  } catch (error) {
    return (error as ProblemDetailsException).getStatus();
  }
  throw new Error('expected evaluation to throw');
}

describe('evaluateApprovalAction', () => {
  it('completes a single ANY step and the request on the first approval', () => {
    expect(
      evaluateApprovalAction(request([step('s1', 1)]), ALICE, 'APPROVED'),
    ).toEqual({
      stepId: 's1',
      stepStatus: 'APPROVED',
      requestStatus: 'APPROVED',
    });
  });

  it('advances to the next step without completing a multi-step request', () => {
    const result = evaluateApprovalAction(
      request([step('s2', 2), step('s1', 1)]),
      ALICE,
      'APPROVED',
    );
    expect(result).toEqual({
      stepId: 's1',
      stepStatus: 'APPROVED',
      requestStatus: undefined,
    });
  });

  it('completes the request when the last pending step is approved', () => {
    const steps = [step('s1', 1, { status: 'APPROVED' }), step('s2', 2)];
    expect(
      evaluateApprovalAction(request(steps), ALICE, 'APPROVED').requestStatus,
    ).toBe('APPROVED');
  });

  it('waits for every named approver on an ALL step', () => {
    const all = step('s1', 1, {
      rule: 'ALL',
      approverSpec: { approverIds: [ALICE, BOB] },
    });
    expect(evaluateApprovalAction(request([all]), ALICE, 'APPROVED')).toEqual({
      stepId: 's1',
      stepStatus: 'PENDING',
    });

    const afterAlice = request(
      [all],
      [{ stepId: 's1', actorId: ALICE, action: 'APPROVED' }],
    );
    expect(
      evaluateApprovalAction(afterAlice, BOB, 'APPROVED').requestStatus,
    ).toBe('APPROVED');
  });

  it('ends the request on rejection or change request', () => {
    const steps = [step('s1', 1), step('s2', 2)];
    expect(
      evaluateApprovalAction(request(steps), ALICE, 'REJECTED').requestStatus,
    ).toBe('REJECTED');
    expect(
      evaluateApprovalAction(request(steps), ALICE, 'CHANGES_REQUESTED')
        .requestStatus,
    ).toBe('CHANGES_REQUESTED');
  });

  it('rejects actors who are not named approvers', () => {
    const named = step('s1', 1, { approverSpec: { approverIds: [ALICE] } });
    expect(
      statusOf(() =>
        evaluateApprovalAction(request([named]), CAROL, 'APPROVED'),
      ),
    ).toBe(HttpStatus.FORBIDDEN);
  });

  it('rejects a second action by the same actor and actions on a closed request', () => {
    const all = step('s1', 1, {
      rule: 'ALL',
      approverSpec: { approverIds: [ALICE, BOB] },
    });
    const acted = request(
      [all],
      [{ stepId: 's1', actorId: ALICE, action: 'APPROVED' }],
    );
    expect(
      statusOf(() => evaluateApprovalAction(acted, ALICE, 'APPROVED')),
    ).toBe(HttpStatus.CONFLICT);

    const closed = { ...request([step('s1', 1)]), status: 'APPROVED' };
    expect(
      statusOf(() => evaluateApprovalAction(closed, ALICE, 'APPROVED')),
    ).toBe(HttpStatus.CONFLICT);
  });

  it('completes a QUORUM step once enough named approvers have approved', () => {
    const quorum = step('s1', 1, {
      rule: 'QUORUM',
      approverSpec: {
        approverIds: [ALICE, BOB, CAROL],
        quorumCount: 2,
      },
    });
    expect(
      evaluateApprovalAction(request([quorum]), ALICE, 'APPROVED'),
    ).toEqual({ stepId: 's1', stepStatus: 'PENDING' });

    const afterAlice = request(
      [quorum],
      [{ stepId: 's1', actorId: ALICE, action: 'APPROVED' }],
    );
    expect(
      evaluateApprovalAction(afterAlice, BOB, 'APPROVED').requestStatus,
    ).toBe('APPROVED');
  });

  it('prefers resolvedUserIds over raw approverIds for the named pool', () => {
    const resolved = step('s1', 1, {
      rule: 'ALL',
      approverSpec: {
        approverIds: [CAROL],
        resolvedUserIds: [ALICE, BOB],
      },
    });
    expect(
      statusOf(() =>
        evaluateApprovalAction(request([resolved]), CAROL, 'APPROVED'),
      ),
    ).toBe(HttpStatus.FORBIDDEN);
    expect(
      evaluateApprovalAction(request([resolved]), ALICE, 'APPROVED').stepStatus,
    ).toBe('PENDING');
  });
});
