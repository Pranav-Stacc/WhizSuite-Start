import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Version lifecycle the workflow engine stores.
abstract final class WorkflowVersionStatuses {
  static const draft = 'DRAFT';
  static const published = 'PUBLISHED';
}

/// An ordered approval pipeline; the first stage is initial, the last terminal.
class Workflow {
  const Workflow({
    required this.id,
    required this.name,
    required this.entityType,
    required this.stages,
    required this.createdAt,
    required this.updatedAt,
    this.slaHours,
    this.requiresClientApproval = false,
    this.active = true,
    this.version,
    this.versionId,
    this.versionStatus,
  });

  factory Workflow.fromJson(Json json) {
    final createdAt = json.date('createdAt') ?? DateTime.now();
    return Workflow(
      id: json.str('id'),
      name: json.str('name'),
      entityType: json.str('entityType'),
      stages: json.strings('stages'),
      slaHours: json.integerOrNull('slaHours'),
      requiresClientApproval: json.flag('requiresClientApproval'),
      active: json.flag('active', true),
      version: json.integerOrNull('version'),
      versionId: json.strOrNull('versionId'),
      versionStatus: json.strOrNull('versionStatus'),
      createdAt: createdAt,
      updatedAt: json.date('updatedAt') ?? createdAt,
    );
  }

  final String id;
  final String name;
  final String entityType;
  final List<String> stages;
  final int? slaHours;
  final bool requiresClientApproval;
  final bool active;

  /// Latest version; the API only exposes this one.
  final int? version;
  final String? versionId;
  final String? versionStatus;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class WorkflowState {
  const WorkflowState({
    required this.key,
    required this.name,
    required this.order,
    this.isInitial = false,
    this.isTerminal = false,
  });

  factory WorkflowState.fromJson(Json json) => WorkflowState(
        key: json.str('key'),
        name: json.str('name'),
        order: json.integer('order'),
        isInitial: json.flag('isInitial'),
        isTerminal: json.flag('isTerminal'),
      );

  final String key;
  final String name;
  final int order;
  final bool isInitial;
  final bool isTerminal;
}

class WorkflowTransition {
  const WorkflowTransition({required this.fromKey, required this.toKey, this.label});

  factory WorkflowTransition.fromJson(Json json) => WorkflowTransition(
        fromKey: json.str('fromStateKey'),
        toKey: json.str('toStateKey'),
        label: json.strOrNull('label'),
      );

  final String fromKey;
  final String toKey;
  final String? label;
}

/// A published or draft snapshot of a workflow's states and allowed moves.
class WorkflowVersion {
  WorkflowVersion({
    required this.id,
    required this.version,
    required this.status,
    required this.states,
    required this.transitions,
    this.publishedAt,
  }) : _names = {for (final state in states) state.key: state.name};

  factory WorkflowVersion.fromJson(Json json) => WorkflowVersion(
        id: json.str('id'),
        version: json.integer('version'),
        status: json.str('status', WorkflowVersionStatuses.draft),
        publishedAt: json.date('publishedAt'),
        states: json.objects('states').map(WorkflowState.fromJson).toList()..sort((a, b) => a.order.compareTo(b.order)),
        transitions: json.objects('transitions').map(WorkflowTransition.fromJson).toList(),
      );

  final String id;
  final int version;
  final String status;
  final DateTime? publishedAt;

  /// Ordered by position in the pipeline.
  final List<WorkflowState> states;
  final List<WorkflowTransition> transitions;
  final Map<String, String> _names;

  bool get isPublished => status == WorkflowVersionStatuses.published;

  String nameOf(String key) => _names[key] ?? key;
}

/// Fields the workflow form edits.
class WorkflowInput {
  const WorkflowInput({
    required this.name,
    required this.stages,
    required this.requiresClientApproval,
    required this.active,
    this.slaHours,
  });

  final String name;
  final List<String> stages;
  final int? slaHours;
  final bool requiresClientApproval;
  final bool active;

  /// Creating omits an empty SLA; editing sends null so the API clears it.
  Json toJson({required bool clearEmpty}) => {
        'name': name,
        'stages': stages,
        if (slaHours != null || clearEmpty) 'slaHours': slaHours,
        'requiresClientApproval': requiresClientApproval,
        'active': active,
      };
}

enum WorkflowStagesIssue { tooFew, tooMany, blank, tooLong }

/// Checks a stage list against the API's limits; null when valid.
WorkflowStagesIssue? validateWorkflowStages(List<String> stages) {
  if (stages.length < minWorkflowStages) return WorkflowStagesIssue.tooFew;
  if (stages.length > maxWorkflowStages) return WorkflowStagesIssue.tooMany;
  if (stages.any((s) => s.trim().isEmpty)) return WorkflowStagesIssue.blank;
  if (stages.any((s) => s.trim().length > maxWorkflowStageLength)) return WorkflowStagesIssue.tooLong;
  return null;
}

enum WorkflowSlaIssue { notANumber, outOfRange }

/// Parses the optional SLA field: blank is "no SLA", otherwise 1..[maxWorkflowSlaHours] whole hours.
({int? hours, WorkflowSlaIssue? issue}) parseWorkflowSla(String raw) {
  final text = raw.trim();
  if (text.isEmpty) return (hours: null, issue: null);
  final hours = int.tryParse(text);
  if (hours == null) return (hours: null, issue: WorkflowSlaIssue.notANumber);
  if (hours < 1 || hours > maxWorkflowSlaHours) return (hours: null, issue: WorkflowSlaIssue.outOfRange);
  return (hours: hours, issue: null);
}
