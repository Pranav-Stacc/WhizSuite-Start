import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/workflows/domain/workflow.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('validateWorkflowStages', () {
    test('accepts a valid pipeline', () {
      expect(
        validateWorkflowStages([
          const WorkflowStage(name: 'Draft'),
          const WorkflowStage(name: 'Review'),
          const WorkflowStage(name: 'Approved'),
        ]),
        isNull,
      );
    });

    test('enforces the stage count limits', () {
      expect(
        validateWorkflowStages(List.generate(minWorkflowStages - 1, (_) => const WorkflowStage(name: 'S'))),
        WorkflowStagesIssue.tooFew,
      );
      expect(
        validateWorkflowStages(List.generate(maxWorkflowStages + 1, (_) => const WorkflowStage(name: 'S'))),
        WorkflowStagesIssue.tooMany,
      );
    });

    test('rejects blank and overlong stage names', () {
      expect(
        validateWorkflowStages([const WorkflowStage(name: 'Draft'), const WorkflowStage(name: '  ')]),
        WorkflowStagesIssue.blank,
      );
      expect(
        validateWorkflowStages([const WorkflowStage(name: 'Draft'), WorkflowStage(name: 'x' * (maxWorkflowStageLength + 1))]),
        WorkflowStagesIssue.tooLong,
      );
    });
  });

  group('parseWorkflowStagesFromJson', () {
    test('reads rich stage objects from the API', () {
      final stages = parseWorkflowStagesFromJson({
        'stages': [
          {
            'name': 'Review',
            'approvalRule': 'ALL',
            'roleIds': ['role-1'],
            'approverIds': ['user-1'],
          },
        ],
      });
      expect(stages.single.name, 'Review');
      expect(stages.single.approvalRule, ApprovalStepRules.all);
      expect(stages.single.roleIds, ['role-1']);
      expect(stages.single.approverIds, ['user-1']);
    });

    test('falls back to stageNames when stages are absent', () {
      final stages = parseWorkflowStagesFromJson({'stageNames': ['Draft', 'Done']});
      expect(stages.map((stage) => stage.name), ['Draft', 'Done']);
    });
  });

  group('parseWorkflowSla', () {
    test('blank means no SLA', () {
      expect(parseWorkflowSla('  '), (hours: null, issue: null));
    });

    test('parses whole hours in range', () {
      expect(parseWorkflowSla(' 48 '), (hours: 48, issue: null));
      expect(parseWorkflowSla('$maxWorkflowSlaHours').hours, maxWorkflowSlaHours);
    });

    test('flags non-numbers and out-of-range values', () {
      expect(parseWorkflowSla('2.5').issue, WorkflowSlaIssue.notANumber);
      expect(parseWorkflowSla('0').issue, WorkflowSlaIssue.outOfRange);
      expect(parseWorkflowSla('${maxWorkflowSlaHours + 1}').issue, WorkflowSlaIssue.outOfRange);
    });
  });

  test('WorkflowVersion sorts states and resolves names', () {
    final version = WorkflowVersion.fromJson({
      'id': 'v1',
      'version': 2,
      'status': 'PUBLISHED',
      'states': [
        {'key': 'approved', 'name': 'Approved', 'order': 2, 'isTerminal': true},
        {'key': 'draft', 'name': 'Draft', 'order': 0, 'isInitial': true},
        {'key': 'review', 'name': 'Review', 'order': 1},
      ],
      'transitions': [
        {'fromStateKey': 'draft', 'toStateKey': 'review'},
      ],
    });
    expect(version.isPublished, isTrue);
    expect(version.states.map((s) => s.key), ['draft', 'review', 'approved']);
    expect(version.transitions.single.toKey, 'review');
    expect(version.nameOf('review'), 'Review');
    expect(version.nameOf('missing'), 'missing');
  });

  group('WorkflowInput.toJson', () {
    const input = WorkflowInput(
      name: 'W',
      stages: [WorkflowStage(name: 'A'), WorkflowStage(name: 'B', approvalRule: ApprovalStepRules.all)],
      requiresClientApproval: true,
      active: true,
    );

    test('serializes stage objects for the API', () {
      final stages = input.toJson(clearEmpty: false)['stages'] as List;
      expect(stages, hasLength(2));
      expect((stages.last as Map)['approvalRule'], ApprovalStepRules.all);
    });

    test('omits an empty SLA on create', () {
      expect(input.toJson(clearEmpty: false).containsKey('slaHours'), isFalse);
    });

    test('sends null SLA on update so the API clears it', () {
      final json = input.toJson(clearEmpty: true);
      expect(json.containsKey('slaHours'), isTrue);
      expect(json['slaHours'], isNull);
    });
  });
}
