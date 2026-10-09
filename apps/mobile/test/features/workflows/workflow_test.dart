import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/workflows/domain/workflow.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('validateWorkflowStages', () {
    test('accepts a valid pipeline', () {
      expect(validateWorkflowStages(['Draft', 'Review', 'Approved']), isNull);
    });

    test('enforces the stage count limits', () {
      expect(validateWorkflowStages(['Only']), WorkflowStagesIssue.tooFew);
      expect(validateWorkflowStages(List.filled(maxWorkflowStages + 1, 'S')), WorkflowStagesIssue.tooMany);
    });

    test('rejects blank and overlong stage names', () {
      expect(validateWorkflowStages(['Draft', '  ']), WorkflowStagesIssue.blank);
      expect(validateWorkflowStages(['Draft', 'x' * (maxWorkflowStageLength + 1)]), WorkflowStagesIssue.tooLong);
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
    const input = WorkflowInput(name: 'W', stages: ['A', 'B'], requiresClientApproval: true, active: true);

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
