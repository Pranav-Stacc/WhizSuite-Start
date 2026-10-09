import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// One step in an approval chain (`ANY` = first approver wins, `ALL` = every named approver).
class ApprovalStep {
  const ApprovalStep({
    required this.id,
    required this.name,
    required this.order,
    required this.rule,
    required this.status,
    this.approverIds = const [],
    this.dueAt,
  });

  factory ApprovalStep.fromJson(Json json) {
    final status = json.str('status', ApprovalStatuses.pending).toUpperCase();
    final rule = json.str('rule', ApprovalStepRules.any).toUpperCase();
    final spec = json.object('approverSpec');
    return ApprovalStep(
      id: json.str('id'),
      name: json.str('name'),
      order: json.integer('order'),
      rule: ApprovalStepRules.values.contains(rule) ? rule : ApprovalStepRules.any,
      status: ApprovalStatuses.values.contains(status) ? status : ApprovalStatuses.pending,
      approverIds: spec?.strings('approverIds') ?? const [],
      dueAt: json.date('dueAt'),
    );
  }

  final String id;
  final String name;
  final int order;
  final String rule;
  final String status;
  final List<String> approverIds;
  final DateTime? dueAt;

  bool get isPending => status == ApprovalStatuses.pending;
  bool get isApproved => status == ApprovalStatuses.approved;

  /// Empty list means anyone with `approvals.approve` may act.
  bool allowsActor(String userId) => approverIds.isEmpty || approverIds.contains(userId);
}

/// A recorded decision on a step (or the request as a whole).
class ApprovalActionRecord {
  const ApprovalActionRecord({
    required this.id,
    required this.actorId,
    required this.action,
    required this.createdAt,
    this.stepId,
    this.comment,
  });

  factory ApprovalActionRecord.fromJson(Json json) {
    final action = json.str('action').toUpperCase();
    return ApprovalActionRecord(
      id: json.str('id'),
      stepId: json.strOrNull('stepId'),
      actorId: json.str('actorId'),
      action: ApprovalActions.values.contains(action) ? action : action,
      comment: json.strOrNull('comment'),
      createdAt: json.date('createdAt') ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
    );
  }

  final String id;
  final String? stepId;
  final String actorId;
  final String action;
  final String? comment;
  final DateTime createdAt;
}

/// An approval request returned by `GET …/approvals` (with steps and actions).
class ApprovalRequest {
  const ApprovalRequest({
    required this.id,
    required this.subjectType,
    required this.subjectId,
    required this.subjectVersion,
    required this.status,
    required this.requestedById,
    required this.createdAt,
    required this.updatedAt,
    this.dueAt,
    this.steps = const [],
    this.actions = const [],
  });

  factory ApprovalRequest.fromJson(Json json) {
    final status = json.str('status', ApprovalStatuses.pending).toUpperCase();
    final steps = json.objects('steps').map(ApprovalStep.fromJson).toList()
      ..sort((a, b) => a.order.compareTo(b.order));
    final actions = json.objects('actions').map(ApprovalActionRecord.fromJson).toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    final pendingStep = steps.where((s) => s.isPending).firstOrNull;
    return ApprovalRequest(
      id: json.str('id'),
      subjectType: json.str('subjectType'),
      subjectId: json.str('subjectId'),
      subjectVersion: json.str('subjectVersion'),
      status: ApprovalStatuses.values.contains(status) ? status : ApprovalStatuses.pending,
      requestedById: json.str('requestedById'),
      dueAt: json.date('dueAt') ?? pendingStep?.dueAt,
      createdAt: json.date('createdAt') ?? DateTime.now(),
      updatedAt: json.date('updatedAt') ?? json.date('createdAt') ?? DateTime.now(),
      steps: steps,
      actions: actions,
    );
  }

  final String id;
  final String subjectType;
  final String subjectId;
  final String subjectVersion;
  final String status;
  final String requestedById;
  final DateTime? dueAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<ApprovalStep> steps;
  final List<ApprovalActionRecord> actions;

  bool get isPending => status == ApprovalStatuses.pending;

  /// First pending step in order, or null when the request is closed / has no open step.
  ApprovalStep? get currentStep => steps.where((s) => s.isPending).firstOrNull;

  /// Effective deadline: request due date, else the current step's.
  DateTime? get effectiveDueAt => dueAt ?? currentStep?.dueAt;

  bool isOverdue([DateTime? now]) {
    final due = effectiveDueAt;
    if (due == null || !isPending) return false;
    return due.isBefore(now ?? DateTime.now());
  }

  /// Whether [userId] may still act on the current step (client-side soft check).
  bool canAct(String userId) {
    if (!isPending) return false;
    final step = currentStep;
    if (step == null || !step.allowsActor(userId)) return false;
    return !actions.any((a) => a.stepId == step.id && a.actorId == userId);
  }
}

/// Client-side list filter (the list API has no query params).
class ApprovalFilter {
  const ApprovalFilter({this.query = '', this.status});

  final String query;
  final String? status;

  ApprovalFilter copyWith({String? query, String? Function()? status}) => ApprovalFilter(
        query: query ?? this.query,
        status: status == null ? this.status : status(),
      );

  bool matches(ApprovalRequest request, {String? requesterName, String? subjectTitle}) {
    if (status != null && request.status != status) return false;
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;
    return request.subjectType.toLowerCase().contains(q) ||
        request.subjectId.toLowerCase().contains(q) ||
        (requesterName?.toLowerCase().contains(q) ?? false) ||
        (subjectTitle?.toLowerCase().contains(q) ?? false) ||
        (request.currentStep?.name.toLowerCase().contains(q) ?? false);
  }
}

/// Pending approval for a given subject, if any.
ApprovalRequest? pendingApprovalFor(
  Iterable<ApprovalRequest> items, {
  required String subjectType,
  required String subjectId,
}) {
  for (final item in items) {
    if (item.isPending && item.subjectType == subjectType && item.subjectId == subjectId) return item;
  }
  return null;
}
