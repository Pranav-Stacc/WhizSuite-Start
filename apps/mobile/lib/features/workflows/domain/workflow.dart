import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Version lifecycle the workflow engine stores.
abstract final class WorkflowVersionStatuses {
  static const draft = 'DRAFT';
  static const published = 'PUBLISHED';
}

List<String> _uuidList(Object? raw) {
  if (raw is! List) return const [];
  return [
    for (final id in raw)
      if (id is String && id.isNotEmpty) id,
  ];
}

String _approvalRule(String? raw) {
  if (raw == ApprovalStepRules.all || raw == ApprovalStepRules.quorum) return raw!;
  return ApprovalStepRules.any;
}

/// How a stage finds approvers. Matches the API `ApproverBases`.
abstract final class ApproverBases {
  static const person = 'PERSON';
  static const role = 'ROLE';
  static const designation = 'DESIGNATION';
  static const department = 'DEPARTMENT';
  static const client = 'CLIENT';
  static const clientContact = 'CLIENT_CONTACT';
  static const project = 'PROJECT';
  static const assignee = 'ASSIGNEE';
  static const values = [person, role, designation, department, client, clientContact, project, assignee];
}

/// What a workflow approves.
abstract final class WorkflowSubjects {
  static const content = 'content';
  static const task = 'task';
  static const project = 'project';
  static const custom = 'custom';
  static const values = [content, task, project, custom];
}

/// One step in an approval pipeline with optional assignees and sign-off rules.
class WorkflowStage {
  const WorkflowStage({
    required this.name,
    this.assigneeRoleId,
    this.approvalRule = ApprovalStepRules.any,
    this.quorumCount,
    this.approverIds = const [],
    this.roleIds = const [],
    this.basis = ApproverBases.role,
    this.targetIds = const [],
    this.scopeType,
    this.scopeResourceId,
  });

  factory WorkflowStage.empty() => const WorkflowStage(name: '');

  factory WorkflowStage.fromJson(Json json) {
    final roleIds = _uuidList(json['roleIds']);
    final assigneeRoleId = json.strOrNull('assigneeRoleId');
    final mergedRoleIds = assigneeRoleId != null && !roleIds.contains(assigneeRoleId)
        ? [...roleIds, assigneeRoleId]
        : roleIds;
    final rule = json.strOrNull('approvalRule');
    final storedBasis = json.strOrNull('basis');
    final basis = ApproverBases.values.contains(storedBasis)
        ? storedBasis!
        : (mergedRoleIds.isNotEmpty ? ApproverBases.role : ApproverBases.person);
    final storedTargets = _uuidList(json['targetIds']);
    return WorkflowStage(
      name: json.str('name'),
      assigneeRoleId: assigneeRoleId ?? (mergedRoleIds.isNotEmpty ? mergedRoleIds.first : null),
      approvalRule: _approvalRule(rule),
      quorumCount: json.integerOrNull('quorumCount'),
      approverIds: _uuidList(json['approverIds']),
      roleIds: mergedRoleIds,
      basis: basis,
      targetIds: storedTargets.isNotEmpty
          ? storedTargets
          : (basis == ApproverBases.role ? mergedRoleIds : _uuidList(json['approverIds'])),
      scopeType: json.strOrNull('scopeType'),
      scopeResourceId: json.strOrNull('scopeResourceId'),
    );
  }

  final String name;
  final String? assigneeRoleId;
  final String approvalRule;
  final int? quorumCount;
  final List<String> approverIds;
  final List<String> roleIds;
  final String basis;
  final List<String> targetIds;
  final String? scopeType;
  final String? scopeResourceId;

  bool get hasAssignees =>
      assigneeRoleId != null || roleIds.isNotEmpty || approverIds.isNotEmpty;

  Json toJson() => {
        'name': name.trim(),
        'approvalRule': approvalRule,
        if (approvalRule == ApprovalStepRules.quorum && quorumCount != null) 'quorumCount': quorumCount,
        'roleIds': basis == ApproverBases.role ? targetIds : roleIds,
        'assigneeRoleId': basis == ApproverBases.role && targetIds.isNotEmpty ? targetIds.first : assigneeRoleId,
        'approverIds': basis == ApproverBases.person ? targetIds : approverIds,
        'basis': basis,
        'targetIds': targetIds,
        if (scopeType != null) 'scopeType': scopeType,
        if (scopeResourceId != null) 'scopeResourceId': scopeResourceId,
      };
}

List<WorkflowStage> parseWorkflowStagesFromJson(Json json) {
  final raw = json['stages'];
  if (raw is List) {
    final stages = <WorkflowStage>[];
    for (final entry in raw) {
      if (entry is String) {
        stages.add(WorkflowStage(name: entry));
      } else if (entry is Map) {
        stages.add(WorkflowStage.fromJson(entry.cast<String, dynamic>()));
      }
    }
    if (stages.isNotEmpty) return stages;
  }
  return json.strings('stageNames').map((name) => WorkflowStage(name: name)).toList();
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
    this.scopeType = 'ORGANIZATION',
    this.scopeId,
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
      entityType: json.str('entityType', WorkflowSubjects.content),
      scopeType: json.str('scopeType', 'ORGANIZATION'),
      scopeId: json.strOrNull('scopeId'),
      stages: parseWorkflowStagesFromJson(json),
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
  final String scopeType;
  final String? scopeId;
  final List<WorkflowStage> stages;
  final int? slaHours;
  final bool requiresClientApproval;
  final bool active;

  /// Latest version; the API only exposes this one.
  final int? version;
  final String? versionId;
  final String? versionStatus;
  final DateTime createdAt;
  final DateTime updatedAt;

  List<String> get stageNames => stages.map((stage) => stage.name).toList();
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
    this.entityType = WorkflowSubjects.content,
    this.scopeType = 'ORGANIZATION',
    this.scopeId,
    this.slaHours,
  });

  final String name;
  final String entityType;
  final String scopeType;
  final String? scopeId;
  final List<WorkflowStage> stages;
  final int? slaHours;
  final bool requiresClientApproval;
  final bool active;

  /// Creating omits an empty SLA; editing sends null so the API clears it.
  Json toJson({required bool clearEmpty}) => {
        'name': name,
        'entityType': entityType,
        'scopeType': scopeId == null ? 'ORGANIZATION' : scopeType,
        if (scopeId != null) 'scopeId': scopeId,
        'stages': stages.map((stage) => stage.toJson()).toList(),
        if (slaHours != null || clearEmpty) 'slaHours': slaHours,
        'requiresClientApproval': requiresClientApproval,
        'active': active,
      };
}

enum WorkflowStagesIssue { tooFew, tooMany, blank, tooLong }

/// Checks a stage list against the API's limits; null when valid.
WorkflowStagesIssue? validateWorkflowStages(List<WorkflowStage> stages) {
  if (stages.length < minWorkflowStages) return WorkflowStagesIssue.tooFew;
  if (stages.length > maxWorkflowStages) return WorkflowStagesIssue.tooMany;
  if (stages.any((stage) => stage.name.trim().isEmpty)) return WorkflowStagesIssue.blank;
  if (stages.any((stage) => stage.name.trim().length > maxWorkflowStageLength)) {
    return WorkflowStagesIssue.tooLong;
  }
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
