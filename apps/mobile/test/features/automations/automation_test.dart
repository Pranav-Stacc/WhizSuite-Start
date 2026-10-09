import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/automations/domain/automation.dart';
import 'package:agency_os/features/automations/domain/automation_recipe.dart';
import 'package:agency_os/features/automations/presentation/automation_recipes.dart';
import 'package:flutter_test/flutter_test.dart';

Automation _automation({String? trigger, String? action, int runs = 0, int failures = 0}) => Automation.fromJson({
      'id': 'a1',
      'name': 'Rule',
      'status': 'ACTIVE',
      'enabled': true,
      'trigger': ?trigger,
      'action': ?action,
      'runs': runs,
      'failures': failures,
      'createdAt': '2026-01-01T00:00:00.000Z',
    });

void main() {
  group('Automation.fromJson', () {
    test('reads fields and falls back updatedAt to createdAt', () {
      final automation = _automation(trigger: AutomationTriggers.leadWon, action: AutomationActions.createTask, runs: 4);
      expect(automation.name, 'Rule');
      expect(automation.enabled, isTrue);
      expect(automation.trigger, AutomationTriggers.leadWon);
      expect(automation.runs, 4);
      expect(automation.lastRunAt, isNull);
      expect(automation.updatedAt, automation.createdAt);
    });

    test('success rate is null before the first run', () {
      expect(_automation().successRate, isNull);
    });

    test('success rate counts non-failed runs', () {
      final automation = _automation(runs: 10, failures: 2);
      expect(automation.successes, 8);
      expect(automation.successRate, closeTo(0.8, 1e-9));
    });

    test('successes never go negative on inconsistent totals', () {
      expect(_automation(runs: 1, failures: 3).successes, 0);
    });
  });

  test('AutomationRun.ok is false only for failed runs', () {
    AutomationRun run(String status) => AutomationRun.fromJson({
          'id': 'r',
          'automationId': 'a',
          'automationName': 'Rule',
          'status': status,
          'createdAt': '2026-01-01T00:00:00.000Z',
        });
    expect(run(AutomationRunStatuses.completed).ok, isTrue);
    expect(run(AutomationRunStatuses.failed).ok, isFalse);
  });

  test('automationMessageKey makes dotted values ICU-safe', () {
    expect(automationMessageKey('content.submitted'), 'content_submitted');
    expect(automationMessageKey('notify'), 'notify');
  });

  test('availableRecipes hides recipes already automated', () {
    final first = automationRecipes.first;
    final remaining = availableRecipes([_automation(trigger: first.trigger, action: first.action)]);
    expect(remaining, isNot(contains(first)));
    expect(remaining, hasLength(automationRecipes.length - 1));
    expect(availableRecipes(const []), hasLength(automationRecipes.length));
  });

  test('AutomationInput.toJson sends every editable field', () {
    const input = AutomationInput(name: 'n', trigger: 't', action: 'a', enabled: false);
    expect(input.toJson(), {'name': 'n', 'trigger': 't', 'action': 'a', 'enabled': false});
  });
}
