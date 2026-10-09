import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Lifecycle states the API stores on an automation (archived ones are never listed).
abstract final class AutomationStatuses {
  static const active = 'ACTIVE';
  static const paused = 'PAUSED';

  static const values = [active, paused];
}

/// Outcomes the API records for a run.
abstract final class AutomationRunStatuses {
  static const completed = 'COMPLETED';
  static const failed = 'FAILED';
}

/// A "when X, then Y" rule with its run totals.
class Automation {
  const Automation({
    required this.id,
    required this.name,
    required this.status,
    required this.enabled,
    required this.createdAt,
    required this.updatedAt,
    this.trigger,
    this.action,
    this.runs = 0,
    this.failures = 0,
    this.lastRunAt,
  });

  factory Automation.fromJson(Json json) {
    final createdAt = json.date('createdAt') ?? DateTime.now();
    return Automation(
      id: json.str('id'),
      name: json.str('name'),
      status: json.str('status', AutomationStatuses.paused),
      enabled: json.flag('enabled'),
      trigger: json.strOrNull('trigger'),
      action: json.strOrNull('action'),
      runs: json.integer('runs'),
      failures: json.integer('failures'),
      lastRunAt: json.date('lastRunAt'),
      createdAt: createdAt,
      updatedAt: json.date('updatedAt') ?? createdAt,
    );
  }

  final String id;
  final String name;
  final String status;
  final bool enabled;
  final String? trigger;
  final String? action;
  final int runs;
  final int failures;
  final DateTime? lastRunAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  int get successes => (runs - failures).clamp(0, runs);

  /// Share of runs that finished without errors (0..1), or null before the first run.
  double? get successRate => runs == 0 ? null : successes / runs;
}

/// One execution of an automation.
class AutomationRun {
  const AutomationRun({
    required this.id,
    required this.automationId,
    required this.automationName,
    required this.status,
    required this.createdAt,
    this.detail,
  });

  factory AutomationRun.fromJson(Json json) => AutomationRun(
        id: json.str('id'),
        automationId: json.str('automationId'),
        automationName: json.str('automationName'),
        status: json.str('status', AutomationRunStatuses.completed),
        detail: json.strOrNull('detail'),
        createdAt: json.date('createdAt') ?? DateTime.now(),
      );

  final String id;
  final String automationId;
  final String automationName;
  final String status;
  final String? detail;
  final DateTime createdAt;

  bool get ok => status != AutomationRunStatuses.failed;
}

/// Fields the automation form edits.
class AutomationInput {
  const AutomationInput({required this.name, required this.trigger, required this.action, required this.enabled});

  final String name;
  final String trigger;
  final String action;
  final bool enabled;

  Json toJson() => {'name': name, 'trigger': trigger, 'action': action, 'enabled': enabled};
}

/// ICU select keys only allow `[A-Za-z0-9_]`, so dotted contract values (`content.submitted`) are mapped.
String automationMessageKey(String value) => value.replaceAll('.', '_');
