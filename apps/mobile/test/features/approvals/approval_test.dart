import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/approvals/domain/approval.dart';
import 'package:flutter_test/flutter_test.dart';

typedef _Json = Map<String, dynamic>;

_Json _step({
  String id = 's1',
  String name = 'Review',
  int order = 1,
  String rule = 'ANY',
  String status = 'PENDING',
  List<String> approverIds = const [],
  String? dueAt,
}) =>
    {
      'id': id,
      'name': name,
      'order': order,
      'rule': rule,
      'status': status,
      'approverSpec': {'approverIds': approverIds},
      'dueAt': ?dueAt,
    };

_Json _request({
  String status = 'PENDING',
  List<_Json>? steps,
  List<_Json>? actions,
  String? dueAt,
}) =>
    {
      'id': 'a1',
      'subjectType': 'CONTENT',
      'subjectId': 'c1',
      'subjectVersion': '1',
      'status': status,
      'requestedById': 'u-req',
      'createdAt': '2026-10-01T09:00:00.000Z',
      'updatedAt': '2026-10-01T09:00:00.000Z',
      'dueAt': ?dueAt,
      'steps': steps ?? [_step()],
      'actions': actions ?? const <_Json>[],
    };

void main() {
  group('ApprovalRequest.fromJson', () {
    test('reads steps, actions and falls back dueAt from the pending step', () {
      final request = ApprovalRequest.fromJson(
        _request(
          steps: [
            _step(id: 's1', order: 2, status: 'APPROVED'),
            _step(id: 's2', order: 1, name: 'First', dueAt: '2026-10-08T12:00:00.000Z'),
          ],
          actions: [
            {
              'id': 'act1',
              'stepId': 's1',
              'actorId': 'u1',
              'action': 'APPROVED',
              'comment': 'Looks good',
              'createdAt': '2026-10-02T10:00:00.000Z',
            },
          ],
        ),
      );

      expect(request.steps.map((s) => s.id), ['s2', 's1']);
      expect(request.currentStep?.id, 's2');
      expect(request.effectiveDueAt, DateTime.utc(2026, 10, 8, 12));
      expect(request.actions.single.comment, 'Looks good');
      expect(request.isPending, isTrue);
    });

    test('tolerates unknown status and empty approverSpec', () {
      final request = ApprovalRequest.fromJson({
        'id': 'a2',
        'subjectType': 'CLIENT',
        'subjectId': 'cl1',
        'subjectVersion': 'v',
        'status': 'WEIRD',
        'requestedById': 'u1',
        'steps': [
          {'id': 's1', 'name': 'Sign-off', 'order': 1, 'rule': 'NOPE', 'status': 'PENDING'},
        ],
      });
      expect(request.status, ApprovalStatuses.pending);
      expect(request.steps.single.rule, ApprovalStepRules.any);
      expect(request.steps.single.approverIds, isEmpty);
    });
  });

  group('ApprovalRequest.canAct', () {
    test('allows any approver when the step has no named list', () {
      final request = ApprovalRequest.fromJson(_request());
      expect(request.canAct('anyone'), isTrue);
    });

    test('restricts to named approvers and blocks a second act on the same step', () {
      final open = ApprovalRequest.fromJson(
        _request(steps: [_step(approverIds: ['alice', 'bob'])]),
      );
      expect(open.canAct('alice'), isTrue);
      expect(open.canAct('carol'), isFalse);

      final acted = ApprovalRequest.fromJson(
        _request(
          steps: [_step(id: 's1', approverIds: ['alice', 'bob'])],
          actions: [
            {
              'id': 'act1',
              'stepId': 's1',
              'actorId': 'alice',
              'action': 'APPROVED',
              'createdAt': '2026-10-02T10:00:00.000Z',
            },
          ],
        ),
      );
      expect(acted.canAct('alice'), isFalse);
      expect(acted.canAct('bob'), isTrue);
    });

    test('rejects actors when the request is already closed', () {
      final closed = ApprovalRequest.fromJson(_request(status: 'APPROVED', steps: [_step(status: 'APPROVED')]));
      expect(closed.canAct('anyone'), isFalse);
    });
  });

  group('ApprovalFilter and pendingApprovalFor', () {
    final items = [
      ApprovalRequest.fromJson(_request()),
      ApprovalRequest.fromJson({
        ..._request(status: 'APPROVED', steps: [_step(status: 'APPROVED')]),
        'id': 'a2',
        'subjectId': 'c2',
      }),
    ];

    test('filters by status and searches requester / title / step', () {
      expect(const ApprovalFilter(status: ApprovalStatuses.pending).matches(items.first), isTrue);
      expect(const ApprovalFilter(status: ApprovalStatuses.approved).matches(items.first), isFalse);
      expect(
        const ApprovalFilter(query: 'hero').matches(items.first, subjectTitle: 'Hero reel'),
        isTrue,
      );
      expect(
        const ApprovalFilter(query: 'review').matches(items.first),
        isTrue,
      );
    });

    test('finds the pending approval for a subject', () {
      expect(
        pendingApprovalFor(items, subjectType: FeedbackSubjectTypes.content, subjectId: 'c1')?.id,
        'a1',
      );
      expect(
        pendingApprovalFor(items, subjectType: FeedbackSubjectTypes.content, subjectId: 'c2'),
        isNull,
      );
    });
  });

  group('isOverdue', () {
    test('uses effective due date only while pending', () {
      final pending = ApprovalRequest.fromJson(
        _request(dueAt: '2026-10-01T00:00:00.000Z'),
      );
      expect(pending.isOverdue(DateTime.utc(2026, 10, 9)), isTrue);
      expect(pending.isOverdue(DateTime.utc(2026, 9, 1)), isFalse);

      final done = ApprovalRequest.fromJson(
        _request(status: 'APPROVED', dueAt: '2026-10-01T00:00:00.000Z', steps: [_step(status: 'APPROVED')]),
      );
      expect(done.isOverdue(DateTime.utc(2026, 10, 9)), isFalse);
    });
  });
}
